import { useId, useState } from 'react'
import type { Day, Week } from '../types'
import { accentFor, phaseTone, typeIcon, typeLabel, ACCENT_TEXT } from '../lib/dayMeta'
import { weekRange } from '../lib/week'
import Icon from './Icon'

interface Props {
  weeks: Week[]
  currentIndex: number
  isDone: (date: string) => boolean
}

// Vue macro en lecture seule : une carte par semaine, dépliable jour par jour.
export default function ProgramOverview({ weeks, currentIndex, isDone }: Props) {
  const [open, setOpen] = useState<number>(currentIndex)

  return (
    <div className="flex flex-col gap-3">
      {weeks.map((w, i) => (
        <WeekRow
          key={w.weekNumber}
          week={w}
          isCurrent={i === currentIndex}
          expanded={open === i}
          onToggle={() => setOpen((prev) => (prev === i ? -1 : i))}
          isDone={isDone}
        />
      ))}
    </div>
  )
}

function WeekRow({
  week,
  isCurrent,
  expanded,
  onToggle,
  isDone
}: {
  week: Week
  isCurrent: boolean
  expanded: boolean
  onToggle: () => void
  isDone: (date: string) => boolean
}) {
  const panelId = useId()
  const doneCount = week.days.filter((d) => isDone(d.date)).length
  const isRaceWeek = week.longRunKm == null

  return (
    <div
      className={`glass overflow-hidden ${isCurrent ? 'ring-2 ring-run/60' : ''}`}
      style={isCurrent ? { boxShadow: '0 8px 40px -12px rgba(252,76,2,0.30)' } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-white/8">
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-white/60">
            Sem
          </span>
          <span className="font-display text-lg font-bold leading-none tabular-nums text-white">
            {week.weekNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`badge bg-white/10 ${phaseTone(week.phase)}`}>{week.phase}</span>
            {isCurrent && <span className="badge bg-run/15 text-run">En cours</span>}
          </div>
          <p className="mt-1 truncate text-[13px] text-white/70">
            {weekRange(week)} ·{' '}
            {isRaceWeek ? (
              <span className="text-run">Course 🏁</span>
            ) : (
              <>
                {week.longRunKm} km long{week.elevationLoad && week.elevationLoad !== '—' ? ` · D+ ${week.elevationLoad}` : ''}
              </>
            )}
          </p>
        </div>

        <span className="shrink-0 font-display text-xs font-semibold tabular-nums text-white/60">
          {doneCount}/{week.days.length}
        </span>
        <Icon
          name="chevron"
          size={18}
          className="shrink-0 text-white/60 transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)]"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out-expo)]"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <ul className="border-t border-white/5 px-4 py-1.5">
            {week.days.map((d) => (
              <DayRow key={d.date} day={d} done={isDone(d.date)} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function DayRow({ day, done }: { day: Day; done: boolean }) {
  const accent = accentFor(day.type)
  const title = day.sessionName ?? day.description ?? typeLabel(day.type)
  const dist =
    day.distanceKm != null ? `${day.distanceKm} km` : day.run?.distanceKm != null ? `${day.run.distanceKm} km` : null

  return (
    <li className="flex items-center gap-3 py-2">
      <Icon name={typeIcon(day.type)} size={16} className={`shrink-0 ${ACCENT_TEXT[accent]}`} />
      <span className="w-9 shrink-0 font-display text-[11px] font-semibold uppercase tracking-wide text-white/60">
        {day.label.slice(0, 3)}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[13px] ${done ? 'text-white/60 line-through' : 'text-white/85'}`}>
        {title}
      </span>
      {dist && <span className="shrink-0 text-[12px] font-medium tabular-nums text-white/60">{dist}</span>}
      {done && <span aria-label="fait" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
    </li>
  )
}
