import type { Week } from '../types'
import { phaseTone } from '../lib/dayMeta'
import { weekRange } from '../lib/week'
import Icon from './Icon'
import WeekStrip from './WeekStrip'
import { BigNumber, TileLabel } from './ui'

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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <TileLabel>
            Semaine {week.weekNumber}/{totalWeeks}
          </TileLabel>
          <p className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight text-white">
            {weekRange(week)}
          </p>
          <span className={`badge mt-2 bg-white/10 ${phaseTone(week.phase)}`}>{week.phase}</span>
        </div>

        {/* Séances cochées : la métrique de la semaine, traitée comme une donnée. */}
        <div className="shrink-0 text-right">
          <BigNumber value={doneCount} unit={`/${week.days.length}`} size="md" />
          <p className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            séances
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
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
