import type { RaceInfo } from '../types'
import { countdownLabel, shortDate } from '../lib/week'
import Icon from './Icon'

interface Props {
  race: RaceInfo
  raceDate: string
}

// Bandeau course : compte à rebours + objectif. Toujours en haut.
export default function RaceBanner({ race, raceDate }: Props) {
  const cd = countdownLabel(raceDate)
  return (
    <div className="glass mb-4 flex items-center gap-3.5 overflow-hidden p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-run/25 bg-run/10">
        <Icon name="flag" size={22} className="text-run" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-white/55">
            {shortDate(raceDate)} 2026
          </span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] text-white/85">
          <span className="font-semibold">
            {race.distanceKm} km · {race.elevationM} D+
          </span>
          <span className="text-white/50">objectif sub-{race.goalTime.replace(':00:00', 'h')}</span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display text-2xl font-bold leading-none tracking-tight text-run tabular-nums">
          {cd}
        </div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          avant la course
        </div>
      </div>
    </div>
  )
}
