import type { Week } from '../types'
import { phaseTone } from '../lib/dayMeta'
import { weekRange } from '../lib/week'
import Icon from './Icon'
import WeekStrip from './WeekStrip'

interface Props {
  week: Week
  totalWeeks: number
  isDone: (date: string) => boolean
  todayDate: string
  onJump: (index: number) => void
}

export default function WeekHeader({ week, totalWeeks, isDone, todayDate, onJump }: Props) {
  const doneCount = week.days.filter((d) => isDone(d.date)).length
  const isRaceWeek = week.longRunKm == null

  return (
    <header className="glass mb-4 overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-white/10 text-white/90">
            Semaine {week.weekNumber}/{totalWeeks}
          </span>
          <span className={`badge bg-white/10 ${phaseTone(week.phase)}`}>{week.phase}</span>
        </div>
        <span className="font-display text-sm font-semibold tabular-nums tracking-wide text-white/70">
          {doneCount}
          <span className="text-white/40">/{week.days.length}</span>
        </span>
      </div>

      <p className="font-display text-lg font-semibold tracking-wide text-white/85">{weekRange(week)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
        {isRaceWeek ? (
          <span className="flex items-center gap-1.5">
            <Icon name="flag" size={15} className="text-run" />
            <span className="font-medium text-run">Semaine de course</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Icon name="route" size={15} className="text-white/40" />
              <span className="font-medium text-white/85">Sortie longue {week.longRunKm} km</span>
            </span>
            {week.elevationLoad && week.elevationLoad !== '—' && (
              <span className="flex items-center gap-1.5">
                <Icon name="mountain" size={15} className="text-white/40" />
                <span className="font-medium text-white/85">D+ {week.elevationLoad}</span>
              </span>
            )}
          </>
        )}
        {week.muscuLegsPhase && week.muscuLegsPhase !== 'arrêt' && (
          <span className="flex items-center gap-1.5">
            <Icon name="dumbbell" size={15} className="text-white/40" />
            <span className="font-medium text-white/85">Jambes : {week.muscuLegsPhase}</span>
          </span>
        )}
      </div>

      <WeekStrip days={week.days} isDone={isDone} todayDate={todayDate} onJump={onJump} />
    </header>
  )
}
