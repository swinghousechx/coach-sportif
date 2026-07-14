import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Program } from '../types'
import { buildReco, type Reco } from '../lib/reco'
import Icon from './Icon'

const STRAVA_LOG = 'https://www.strava.com/athlete/training'
const EASE_EXPO = [0.16, 1, 0.3, 1] as const

interface Props {
  program: Program
  todayDate: string
}

// Onglet Reco : synchro Strava (simplifiée) + analyse de la séance du jour à la demande.
export default function RecoTab({ program, todayDate }: Props) {
  const reduce = useReducedMotion()
  const [state, setState] = useState<'idle' | 'analyzing' | 'done'>('idle')

  // Séance du jour, sinon la prochaine séance à venir.
  const resolved = useMemo(() => {
    const flat = program.weeks.flatMap((w) => w.days.map((d) => ({ day: d, week: w })))
    let i = flat.findIndex((x) => x.day.date === todayDate)
    let isToday = true
    if (i < 0) {
      i = flat.findIndex((x) => x.day.date >= todayDate)
      isToday = false
    }
    if (i < 0) i = flat.length - 1
    return { entry: flat[i], tomorrow: flat[i + 1]?.day, isToday }
  }, [program, todayDate])

  const reco: Reco | null = useMemo(() => {
    if (!resolved.entry) return null
    return buildReco(resolved.entry.day, resolved.entry.week, resolved.tomorrow, resolved.isToday)
  }, [resolved])

  function analyze() {
    if (reduce) {
      setState('done')
      return
    }
    setState('analyzing')
    // Petit délai : signale un vrai "calcul" (perçu comme plus fiable qu'instantané).
    window.setTimeout(() => setState('done'), 650)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Synchro Strava */}
      <div className="glass p-4">
        <div className="flex items-center gap-2.5">
          <StravaMark size={18} />
          <span className="font-display text-base font-semibold uppercase tracking-widest text-white/85">
            Strava
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-white/60">
          Sync auto (course + muscu Hevy) bientôt. Pour l'instant, ouvre ton journal pour pointer la séance.
        </p>
        <a
          href={STRAVA_LOG}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-run/25 bg-run/10 px-3.5 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-run transition-colors hover:bg-run/15"
        >
          <StravaMark size={14} />
          Synchroniser Strava
          <Icon name="external" size={14} />
        </a>
      </div>

      {/* Analyse à la demande */}
      {state !== 'done' ? (
        <div className="glass flex flex-col items-center px-5 py-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-gym/25 bg-gym/10">
            <Icon name="activity" size={26} className="text-gym" />
          </div>
          <p className="text-pretty text-[14px] leading-snug text-white/70">
            Obtiens ton briefing coach du jour : exécution, cibles, nutrition et points de vigilance,
            synthétisés depuis ton plan.
          </p>
          <button
            type="button"
            onClick={analyze}
            disabled={state === 'analyzing' || !reco}
            className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-gym px-5 py-3 font-display text-[13px] font-semibold uppercase tracking-widest text-ink transition active:scale-[0.98] disabled:opacity-60"
          >
            {state === 'analyzing' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Icon name="trending-up" size={18} strokeWidth={2.5} />
                Analyser ma séance du jour
              </>
            )}
          </button>
        </div>
      ) : (
        reco && <RecoCard reco={reco} reduce={!!reduce} onRefresh={() => setState('idle')} />
      )}
    </div>
  )
}

function RecoCard({ reco, reduce, onRefresh }: { reco: Reco; reduce: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="glass p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="badge bg-gym/15 text-gym">Reco du jour</span>
        </div>
        <h2 className="text-balance font-display text-2xl font-bold leading-tight tracking-tight text-white">
          {reco.headline}
        </h2>
        {reco.subtitle && <p className="mt-1 text-[13px] leading-snug text-white/60">{reco.subtitle}</p>}
      </div>

      {reco.sections.map((s, i) => (
        <motion.section
          key={s.title}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_EXPO, delay: reduce ? 0 : i * 0.07 }}
          className="glass p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Icon name={s.icon} size={17} className={sectionTone(s.title)} />
            <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-white/80">
              {s.title}
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {s.items.map((it, j) => (
              <li key={j} className="flex gap-2 text-pretty text-[13.5px] leading-snug text-white/85">
                <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dotTone(s.title)}`} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      ))}

      <button
        type="button"
        onClick={onRefresh}
        className="focus-ring mx-auto mt-1 text-[12px] font-semibold uppercase tracking-widest text-white/45 transition-colors hover:text-white/70"
      >
        Réinitialiser
      </button>
    </div>
  )
}

function sectionTone(title: string): string {
  if (title.startsWith('Nutrition')) return 'text-run'
  if (title.startsWith('Vigilance')) return 'text-amber-400'
  if (title.startsWith('Réalisé')) return 'text-run'
  return 'text-gym'
}
function dotTone(title: string): string {
  if (title.startsWith('Nutrition') || title.startsWith('Réalisé')) return 'bg-run'
  if (title.startsWith('Vigilance')) return 'bg-amber-400'
  return 'bg-gym'
}

function StravaMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="text-run">
      <path d="M13.8 2 7.3 14.6h3.9L13.8 9l2.6 5.6h3.8L13.8 2Zm2.6 12.6-1.9 3.7-1.9-3.7H9.9L14.5 24l4.6-9.4h-2.7Z" />
    </svg>
  )
}
