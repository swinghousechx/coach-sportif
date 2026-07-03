import { useEffect, useMemo, useRef, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import type { Program } from './types'
import { isBlockExpired, todayName } from './lib/week'
import { loadStoredProgram, saveProgram, loadDone, saveDone } from './lib/storage'
import Header from './components/Header'
import DayCard from './components/DayCard'
import CollapsibleSection from './components/CollapsibleSection'
import UpdateButton from './components/UpdateButton'
import ExpiredBanner from './components/ExpiredBanner'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export default function App() {
  const [program, setProgram] = useState<Program | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [done, setDone] = useState<Record<number, boolean>>(() => loadDone())

  const dayRefs = useRef<(HTMLElement | null)[]>([])
  const scrolledRef = useRef(false)

  // Chargement initial : programme importé (localStorage) sinon public/program.json.
  useEffect(() => {
    const stored = loadStoredProgram()
    if (stored) {
      setProgram(stored)
      return
    }
    fetch(`${import.meta.env.BASE_URL}program.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data: Program) => setProgram(data))
      .catch(() => setLoadError(true))
  }, [])

  const today = useMemo(() => todayName(), [])
  const todayIndex = useMemo(
    () => (program ? program.days.findIndex((d) => d.day.toLowerCase() === today) : -1),
    [program, today]
  )

  function scrollToDay(index: number) {
    dayRefs.current[index]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center'
    })
  }

  // Auto-scroll vers le jour courant, une seule fois après le rendu.
  useEffect(() => {
    if (!program || scrolledRef.current || todayIndex < 0) return
    scrolledRef.current = true
    const t = setTimeout(() => scrollToDay(todayIndex), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, todayIndex])

  function toggleDone(index: number) {
    setDone((prev) => {
      const next = { ...prev, [index]: !prev[index] }
      saveDone(next)
      return next
    })
  }

  function handleLoaded(next: Program) {
    saveProgram(next)
    setProgram(next)
    setLoadError(false)
    setDone({})
    saveDone({})
    scrolledRef.current = false
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

  if (!program) {
    return (
      <div className="flex min-h-full items-center justify-center" role="status" aria-label="Chargement">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-run" />
      </div>
    )
  }

  const expired = isBlockExpired(program.blockValidUntil)

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto min-h-full max-w-md px-4 pb-10 pt-4">
        {expired && <ExpiredBanner />}

        <Header program={program} done={done} todayIndex={todayIndex} onJump={scrollToDay} />

        <h2 className="mb-2 px-1 font-display text-lg font-semibold uppercase tracking-widest text-white/55">
          La semaine
        </h2>

        <div className="flex flex-col gap-3">
          {program.days.map((d, i) => (
            <DayCard
              key={`${d.day}-${i}`}
              day={d}
              index={i}
              isToday={i === todayIndex}
              done={!!done[i]}
              onToggle={() => toggleDone(i)}
              ref={(el) => {
                dayRefs.current[i] = el
              }}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <CollapsibleSection title="Nutrition" icon="flame" tone="text-run">
            {program.nutrition}
          </CollapsibleSection>
          <CollapsibleSection title="Progression" icon="trending-up" tone="text-gym">
            {program.progression}
          </CollapsibleSection>
          <CollapsibleSection title="Vigilance" icon="alert" tone="text-amber-400">
            {program.vigilance}
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <UpdateButton onLoaded={handleLoaded} />
          <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-white/45">
            Bloc valable jusqu'au {program.blockValidUntil}. Fonctionne hors-ligne une fois installé.
          </p>
        </div>
      </div>
    </MotionConfig>
  )
}
