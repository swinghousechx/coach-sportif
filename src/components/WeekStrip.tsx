import type { Day } from '../types'
import { accentFor, ACCENT_CSS } from '../lib/dayMeta'

interface Props {
  days: Day[]
  isDone: (date: string) => boolean
  todayDate: string
  onJump: (index: number) => void
}

// Bande de la semaine : un segment par jour, coloré par type (course/muscu/repos).
// Fait = la barre se remplit d'un balayage. Jour courant cerclé. Tap = saut vers la carte.
export default function WeekStrip({ days, isDone, todayDate, onJump }: Props) {
  return (
    <div className="mt-4 flex items-end gap-1.5" role="list" aria-label="Progression de la semaine">
      {days.map((d, i) => {
        const done = isDone(d.date)
        const isToday = d.date === todayDate
        const accent = ACCENT_CSS[accentFor(d.type)]
        return (
          <button
            key={d.date}
            type="button"
            role="listitem"
            onClick={() => onJump(i)}
            aria-label={`${d.label}${done ? ' (fait)' : ''}`}
            aria-current={isToday ? 'date' : undefined}
            className="group flex min-h-[44px] flex-1 flex-col items-center justify-end gap-1.5 rounded-lg py-1 transition-transform duration-150 focus-ring active:scale-90"
          >
            <span
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/12"
              style={isToday ? { boxShadow: `0 0 0 1.5px ${accent}, 0 0 10px -2px ${accent}` } : undefined}
            >
              <span
                className="absolute inset-0 origin-left rounded-full"
                style={{
                  background: accent,
                  transform: `scaleX(${done ? 1 : 0})`,
                  transition: 'transform 400ms var(--ease-out-expo)'
                }}
              />
            </span>
            {/* Le jour courant est déjà porté par l'anneau, le halo et aria-current :
                son libellé passe en blanc plein plutôt qu'en accent — l'accent « repos »
                est un ton de graphique (3:1), illisible en texte. */}
            <span
              className={`font-display text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                isToday ? 'text-white' : 'text-white/60 group-hover:text-white/80'
              }`}
            >
              {d.label.slice(0, 3)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
