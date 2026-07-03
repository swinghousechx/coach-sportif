import type { Day } from '../types'

interface Props {
  days: Day[]
  done: Record<number, boolean>
  todayIndex: number
  onJump: (index: number) => void
}

// Bande hebdo : un segment par jour, coloré par type (course/salle).
// Fait = la barre d'accent se remplit d'un balayage (scaleX). Jour courant cerclé.
// Tap = saut vers la carte du jour. La couleur porte du sens : progression + repérage.
export default function WeekStrip({ days, done, todayIndex, onJump }: Props) {
  return (
    <div className="mt-4 flex items-end gap-1.5" role="list" aria-label="Progression de la semaine">
      {days.map((d, i) => {
        const isRun = d.type === 'course'
        const isDone = !!done[i]
        const isToday = i === todayIndex
        const accent = isRun ? 'var(--run)' : 'var(--gym)'
        return (
          <button
            key={`${d.day}-${i}`}
            type="button"
            role="listitem"
            onClick={() => onJump(i)}
            aria-label={`${d.day} — ${d.title}${isDone ? ' (fait)' : ''}`}
            aria-current={isToday ? 'date' : undefined}
            className="group flex flex-1 flex-col items-center gap-1.5 rounded-lg py-1 transition-transform duration-150 focus-ring active:scale-90"
          >
            <span
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/12"
              style={
                isToday
                  ? { boxShadow: `0 0 0 1.5px ${accent}, 0 0 10px -2px ${accent}` }
                  : undefined
              }
            >
              {/* Remplissage qui balaye de gauche à droite quand la séance est faite. */}
              <span
                className="absolute inset-0 origin-left rounded-full"
                style={{
                  background: accent,
                  transform: `scaleX(${isDone ? 1 : 0})`,
                  transition: 'transform 400ms var(--ease-out-expo)'
                }}
              />
            </span>
            <span
              className={`font-display text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                isToday ? '' : 'text-white/45 group-hover:text-white/70'
              }`}
              style={isToday ? { color: accent } : undefined}
            >
              {d.day.slice(0, 3)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
