import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Day, Program, RunDetail, Week } from '../types'
import { accentFor, typeLabel, typeIcon, ACCENT_TEXT, ACCENT_BG, ACCENT_RING } from '../lib/dayMeta'
import { isCoachEnabled } from '../lib/coach'
import Icon from './Icon'
import NutritionBlock from './NutritionBlock'
import StravaLink from './StravaLink'
import CoachDebrief from './CoachDebrief'

interface Props {
  day: Day
  index: number
  isToday: boolean
  done: boolean
  onToggle: () => void
  /** Rétablit la séance d'origine si la journée a été adaptée avec le coach. */
  onRevert?: () => void
  week?: Week
  program?: Program
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

const DayCard = forwardRef<HTMLElement, Props>(function DayCard(
  { day, index, isToday, done, onToggle, onRevert, week, program },
  ref
) {
  // Replié par défaut, sauf le jour même et le jour de course : la semaine se lit d'un coup d'œil.
  const [open, setOpen] = useState(isToday || day.type === 'race')
  const accent = accentFor(day.type)
  const accentText = ACCENT_TEXT[accent]
  const isRace = day.type === 'race'
  const hasExercises = !!day.exercises && day.exercises.length > 0
  const showRunSummary =
    day.type === 'run' || day.type === 'long_run' || day.type === 'hike' || isRace
  const isMuscu = day.type === 'gym' || day.type === 'gym_and_run'
  const isRunFamily = day.type === 'run' || day.type === 'long_run' || day.type === 'hike' || isRace

  const title = day.sessionName ?? day.description ?? typeLabel(day.type)

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: done ? 0.55 : 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, ease: 'easeOut' },
        y: { duration: 0.45, ease: EASE_EXPO, delay: index * 0.04 }
      }}
      className={[
        'glass relative p-4',
        isToday ? `bg-white/[0.07] ring-2 ${ACCENT_RING[accent]}` : '',
        isRace && !isToday ? 'ring-2 ring-run/50' : ''
      ].join(' ')}
      style={
        isToday || isRace
          ? { boxShadow: `0 8px 40px -12px ${accent === 'run' || isRace ? 'rgba(252,76,2,0.35)' : accent === 'gym' ? 'rgba(185,255,60,0.28)' : 'rgba(255,255,255,0.15)'}` }
          : undefined
      }
    >
      <span
        aria-hidden
        className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${
          accent === 'run' ? 'bg-run' : accent === 'gym' ? 'bg-gym' : 'bg-white/25'
        }`}
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        {/* L'en-tête entier plie/déplie la journée. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-ring min-w-0 flex-1 text-left"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`badge ${ACCENT_BG[accent]} ${accentText} inline-flex items-center gap-1`}>
              <Icon name={typeIcon(day.type)} size={12} />
              {typeLabel(day.type)}
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-white/55">
              {day.label}
            </span>
            {isToday && <span className={`badge bg-white/12 ${accentText}`}>Aujourd'hui</span>}
            {day.adapted && <span className="badge bg-white/12 text-white/70">Adapté</span>}
          </div>

          <div className="flex items-start gap-2">
            <Icon
              name="chevron"
              size={16}
              className="mt-1 shrink-0 text-white/35 transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)]"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
            <h2
              className={`text-balance font-display font-semibold leading-tight tracking-tight ${
                isRace ? 'text-2xl' : 'text-xl'
              } ${done ? 'text-white/70 line-through decoration-white/40' : 'text-white'}`}
            >
              {title}
            </h2>
          </div>

          {isRace && day.goalTime && (
            <p className="mt-1 font-display text-sm font-semibold uppercase tracking-widest text-run">
              Objectif {day.goalTime.replace(':00:00', 'h')}
            </p>
          )}
        </button>

        <ToggleDone done={done} onToggle={onToggle} label={title} />
      </div>

      {/* Corps repliable (grid-template-rows 0fr→1fr, comme le débrief). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out-expo)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {!day.sessionName && day.description && showRunSummary && day.description !== title && (
            <p className="mt-1 pl-2 text-[13px] leading-snug text-white/70">{day.description}</p>
          )}
          {day.type === 'rest_or_easy' && (
            <p className="mt-1 pl-2 text-[13px] leading-snug text-white/70">{day.description}</p>
          )}

          {/* Journée modifiée avec le coach : on dit pourquoi, et on peut revenir en arrière. */}
          {day.adapted && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-pretty text-[12px] leading-snug text-white/55">{day.adapted.raison}</p>
              {onRevert && (
                <button
                  type="button"
                  onClick={onRevert}
                  className="focus-ring shrink-0 text-[11px] font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-white/75"
                >
                  Rétablir
                </button>
              )}
            </div>
          )}

          {showRunSummary && <RunSummary detail={day} className="pl-2" />}

          {hasExercises && (
            <ul className="mt-3 divide-y divide-white/5 border-t border-white/5 pl-2 pt-1">
              {day.exercises!.map((ex, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-white/90">{ex.name}</span>
                    {ex.note && (
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/45">
                        {ex.note}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 font-display text-lg font-bold tabular-nums tracking-wide ${accentText}`}
                  >
                    {ex.sets}×{ex.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Muscu : Hevy remonte la séance sur Strava (WeightTraining) → matching + réalisé. */}
          {isMuscu && <StravaLink summary={day.strava} />}

          {/* Bloc course dans une journée muscu + course (jeudi). */}
          {day.type === 'gym_and_run' && day.run && (
            <div className="mt-3 rounded-2xl border border-run/20 bg-run/[0.06] p-3">
              <div className="mb-1 flex items-center gap-2">
                <Icon name="activity" size={15} className="text-run" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-run">
                  Course qualité
                </span>
              </div>
              {day.run.description && (
                <p className="text-[13px] leading-snug text-white/80">{day.run.description}</p>
              )}
              <RunSummary detail={day.run} className="mt-2" />
              <StravaLink summary={day.runStrava} />
            </div>
          )}

          {isRunFamily && <StravaLink summary={day.strava} />}

          {day.nutrition && <NutritionBlock nutrition={day.nutrition} />}

          {/* Débrief IA de la séance réelle (Strava) — sur chaque jour, repos compris :
              un jour « repos ou footing » se débriefe aussi (footing fait ? repos tenu ?). */}
          {isCoachEnabled() && week && program && (
            <CoachDebrief day={day} week={week} program={program} />
          )}
        </div>
      </div>
    </motion.section>
  )
})

// Résumé course : distance, D+, zone/allure sous forme de stats compactes.
function RunSummary({ detail, className = '' }: { detail: RunDetail; className?: string }) {
  const items: { icon: 'route' | 'mountain' | 'heart'; value: string }[] = []
  if (detail.distanceKm != null) items.push({ icon: 'route', value: `${detail.distanceKm} km` })
  if (detail.elevationM != null) items.push({ icon: 'mountain', value: `${detail.elevationM} m D+` })
  if (detail.zone) items.push({ icon: 'heart', value: detail.zone })
  if (items.length === 0) return null

  return (
    <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Icon name={it.icon} size={15} className="shrink-0 text-white/40" />
          <span className="text-[13px] font-medium text-white/85">{it.value}</span>
        </span>
      ))}
    </div>
  )
}

function ToggleDone({
  done,
  onToggle,
  label
}: {
  done: boolean
  onToggle: () => void
  label: string
}) {
  const reduce = useReducedMotion()
  const prev = useRef(done)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (done && !prev.current && !reduce) setPulse((p) => p + 1)
    prev.current = done
  }, [done, reduce])

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.06 }}
      transition={{ duration: 0.15, ease: EASE_EXPO }}
      aria-pressed={done}
      aria-label={done ? `${label} : marquer comme non fait` : `${label} : marquer comme fait`}
      className={[
        'focus-ring relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
        done
          ? 'border-emerald-400 bg-emerald-400 text-ink'
          : 'border-white/30 bg-white/5 text-white/55 hover:border-white/50 hover:text-white/80'
      ].join(' ')}
    >
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={pulse}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ border: '2px solid rgb(52 211 153)' }}
            initial={{ scale: 0.9, opacity: 0.55 }}
            animate={{ scale: 1.75, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={3}>
        <motion.path
          d="M5 13l4 4L19 7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{
            pathLength: { duration: reduce ? 0 : 0.32, ease: EASE_EXPO },
            opacity: { duration: 0.12 }
          }}
        />
      </svg>
    </motion.button>
  )
}

export default DayCard
