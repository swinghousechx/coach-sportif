import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Day } from '../types'

interface Props {
  day: Day
  index: number
  isToday: boolean
  done: boolean
  onToggle: () => void
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

const DayCard = forwardRef<HTMLElement, Props>(function DayCard(
  { day, index, isToday, done, onToggle },
  ref
) {
  const isRun = day.type === 'course'
  const accentText = isRun ? 'text-run' : 'text-gym'
  const accentBg = isRun ? 'bg-run/15' : 'bg-gym/15'

  return (
    <motion.section
      ref={ref}
      // Entrée en cascade rapide et plafonnée (rythme de liste), une seule fois au montage.
      initial={{ opacity: 0, y: 10 }}
      // L'opacité "done" est pilotée ici : elle grise vraiment la carte (l'inline framer
      // primait sinon sur la classe opacity-55).
      animate={{ opacity: done ? 0.55 : 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, ease: 'easeOut' },
        y: { duration: 0.45, ease: EASE_EXPO, delay: index * 0.04 }
      }}
      className={[
        'glass relative p-4',
        isToday ? `bg-white/[0.07] ${isRun ? 'ring-2 ring-run/70' : 'ring-2 ring-gym/70'}` : ''
      ].join(' ')}
      style={
        isToday
          ? { boxShadow: `0 8px 40px -12px ${isRun ? 'rgba(252,76,2,0.35)' : 'rgba(185,255,60,0.28)'}` }
          : undefined
      }
    >
      {/* Liseré d'accent vertical à gauche */}
      <span
        aria-hidden
        className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${isRun ? 'bg-run' : 'bg-gym'}`}
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`badge ${accentBg} ${accentText}`}>{isRun ? 'Course' : 'Salle'}</span>
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-white/55">
              {day.day}
            </span>
            {isToday && <span className={`badge bg-white/12 ${accentText}`}>Aujourd'hui</span>}
          </div>

          <h2
            className={`text-balance font-display text-xl font-semibold leading-tight tracking-tight transition-colors duration-300 ${
              done ? 'text-white/70 line-through decoration-white/40' : 'text-white'
            }`}
          >
            {day.title}
          </h2>

          {day.detail && (
            <p className="mt-1 text-[13px] leading-snug text-white/70">{day.detail}</p>
          )}
        </div>

        <ToggleDone done={done} onToggle={onToggle} label={day.title} />
      </div>

      {day.exercises && day.exercises.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5 border-t border-white/5 pl-2 pt-1">
          {day.exercises.map((ex, i) => {
            const isPriority = !!ex.target && /priorit/i.test(ex.target)
            return (
              <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                <span className="flex min-w-0 items-baseline gap-1.5">
                  {isPriority && (
                    <span
                      aria-hidden
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${isRun ? 'bg-run' : 'bg-gym'}`}
                    />
                  )}
                  <span className="min-w-0 truncate text-[15px] text-white/90">{ex.name}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2 text-right">
                  <span className={`font-display text-lg font-bold tabular-nums tracking-wide ${accentText}`}>
                    {ex.sets}
                  </span>
                  {ex.target && (
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isPriority ? accentText : 'text-white/55'
                      }`}
                    >
                      {ex.target}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {day.note && (
        <p className="mt-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-[12px] leading-snug text-white/65">
          {day.note}
        </p>
      )}
    </motion.section>
  )
})

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

  // Impulsion de succès uniquement quand l'utilisateur coche (non → oui), jamais au montage.
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
      {/* Onde de succès, jouée une fois par validation. */}
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

      {/* Coche qui se trace au moment de la validation. */}
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
