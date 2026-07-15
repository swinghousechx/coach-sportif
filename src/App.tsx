import { useEffect, useMemo, useRef, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import type { Adaptation, Program } from './types'
import { currentWeekIndex, todayISO } from './lib/week'
import { loadStoredProgram, saveProgram, loadDoneOverrides, saveDoneOverrides } from './lib/storage'
import { applyAdaptations, loadAdaptations, saveAdaptations } from './lib/adapt'
import { loadCarnet, type CarnetEntry } from './lib/carnet'
import Tabs, { type TabKey } from './components/Tabs'
import RaceBanner from './components/RaceBanner'
import WeekHeader from './components/WeekHeader'
import DayCard from './components/DayCard'
import ProgramOverview from './components/ProgramOverview'
import RecoTab from './components/RecoTab'
import UpdateButton from './components/UpdateButton'
import PullToRefresh from './components/PullToRefresh'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function App() {
  const [basePlan, setBasePlan] = useState<Program | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<TabKey>('week')
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => loadDoneOverrides())
  const [adaptations, setAdaptations] = useState<Record<string, Adaptation>>(() => loadAdaptations())
  const [carnet, setCarnet] = useState<CarnetEntry[]>(() => loadCarnet())

  const dayRefs = useRef<(HTMLElement | null)[]>([])
  const scrolledRef = useRef(false)

  useEffect(() => {
    const stored = loadStoredProgram()
    if (stored) {
      setBasePlan(stored)
      return
    }
    fetch(`${import.meta.env.BASE_URL}program.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data: Program) => setBasePlan(data))
      .catch(() => setLoadError(true))
  }, [])

  const today = todayISO()

  // Le plan affiché = plan de référence + adaptations décidées avec le coach.
  const program = useMemo(
    () => (basePlan ? applyAdaptations(basePlan, adaptations) : null),
    [basePlan, adaptations]
  )

  function applyAdaptation(a: Adaptation) {
    setAdaptations((prev) => {
      const next = { ...prev, [a.date]: { ...a, appliedAt: new Date().toISOString() } }
      saveAdaptations(next)
      return next
    })
  }

  function revertAdaptation(date: string) {
    setAdaptations((prev) => {
      const next = { ...prev }
      delete next[date]
      saveAdaptations(next)
      return next
    })
  }

  // Dates pré-cochées depuis le JSON (day.status === 'done').
  const seedDone = useMemo(() => {
    const set = new Set<string>()
    program?.weeks.forEach((w) => w.days.forEach((d) => d.status === 'done' && set.add(d.date)))
    return set
  }, [program])

  const isDone = (date: string) => (date in overrides ? overrides[date] : seedDone.has(date))

  const currentIndex = useMemo(
    () => (program ? currentWeekIndex(program.weeks, today) : 0),
    [program, today]
  )
  const currentWeek = program?.weeks[currentIndex]

  function scrollToDay(index: number) {
    dayRefs.current[index]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center'
    })
  }

  // Auto-scroll sur le jour du jour, une fois, à l'ouverture (onglet semaine).
  useEffect(() => {
    if (!currentWeek || scrolledRef.current || tab !== 'week') return
    const idx = currentWeek.days.findIndex((d) => d.date === today)
    if (idx < 0) return
    scrolledRef.current = true
    const t = setTimeout(() => scrollToDay(idx), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, tab])

  function toggleDone(date: string) {
    setOverrides((prev) => {
      const next = { ...prev, [date]: !isDone(date) }
      saveDoneOverrides(next)
      return next
    })
  }

  function handleLoaded(next: Program) {
    saveProgram(next)
    setBasePlan(next)
    setLoadError(false)
    scrolledRef.current = false // les coches (par date) sont conservées
  }

  if (loadError && !program) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-white/75">
          Impossible de charger le programme. Importe un fichier <code>program.json</code>.
        </p>
        <div className="w-full">
          <UpdateButton onLoaded={handleLoaded} />
        </div>
      </div>
    )
  }

  if (!program || !currentWeek) {
    return (
      <div className="flex min-h-full items-center justify-center" role="status" aria-label="Chargement">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-run" />
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <PullToRefresh onRefresh={() => window.location.reload()}>
      {/* Pas de bouton « rafraîchir » : le tirer-pour-rafraîchir le remplace sur mobile,
          et Cmd+R le fait sur ordinateur. Il n'occupait plus qu'un coin. */}
      <div className="mx-auto min-h-full max-w-md px-4 pb-10 pt-4">
        <RaceBanner race={program.raceInfo} raceDate={program.raceDate} />

        <Tabs value={tab} onChange={setTab} />

        {tab === 'week' && (
          <>
            <WeekHeader
              week={currentWeek}
              totalWeeks={program.weeks.length}
              isDone={isDone}
              todayDate={today}
              onJump={scrollToDay}
            />

            <div className="flex flex-col gap-3">
              {currentWeek.days.map((d, i) => (
                <DayCard
                  key={d.date}
                  day={d}
                  index={i}
                  isToday={d.date === today}
                  done={isDone(d.date)}
                  onToggle={() => toggleDone(d.date)}
                  onRevert={() => revertAdaptation(d.date)}
                  onCarnet={() => setCarnet(loadCarnet())}
                  week={currentWeek}
                  program={program}
                  ref={(el) => {
                    dayRefs.current[i] = el
                  }}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'plan' && (
          <ProgramOverview weeks={program.weeks} currentIndex={currentIndex} isDone={isDone} />
        )}

        {tab === 'reco' && (
          <RecoTab
            program={program}
            todayDate={today}
            onApplyAdaptation={applyAdaptation}
            carnet={carnet}
            onCarnetChange={() => setCarnet(loadCarnet())}
          />
        )}

        {/* Pas d'import de programme ici : le plan est généré par scripts/gen-plan.mjs et
            déployé avec l'app. Un fichier importé s'épinglait dans localStorage, et l'app ne
            relisait alors plus jamais program.json — toute correction ultérieure passait à la
            trappe en silence. L'import ne survit que sur l'écran d'erreur, en secours. */}
        <p className="mt-6 px-2 text-center text-[12px] leading-relaxed text-white/60">
          Plan marathon trail · course le 11 oct. 2026. Fonctionne hors-ligne une fois installé.
        </p>
      </div>
      </PullToRefresh>
    </MotionConfig>
  )
}
