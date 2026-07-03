import type { Day, Program } from '../types'
import Icon from './Icon'
import WeekStrip from './WeekStrip'

interface Props {
  program: Program
  done: Record<number, boolean>
  todayIndex: number
  onJump: (index: number) => void
}

export default function Header({ program, done, todayIndex, onJump }: Props) {
  const total = program.days.length
  const doneCount = program.days.filter((_: Day, i: number) => done[i]).length

  return (
    <header className="glass mb-4 overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="badge bg-white/10 text-white/90">Semaine {program.weekNumber}</span>
          <span className="badge bg-white/10 text-white/65">{program.weekOfBlock} du bloc</span>
        </div>
        <span className="font-display text-sm font-semibold tabular-nums tracking-wide text-white/70">
          {doneCount}<span className="text-white/40">/{total}</span>
        </span>
      </div>

      <h1 className="text-balance font-display text-2xl font-bold leading-tight tracking-tight text-white">
        {program.blockName}
      </h1>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="text-white/55">Priorité</span>
        <span className="font-display text-lg font-semibold tracking-wide text-run">
          {program.priority}
        </span>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-2xl border border-run/25 bg-run/10 px-3.5 py-2.5">
        <Icon name="activity" size={18} className="mt-[2px] shrink-0 text-run" />
        <p className="text-[13px] leading-snug text-white/90">{program.runningRule}</p>
      </div>

      <WeekStrip days={program.days} done={done} todayIndex={todayIndex} onJump={onJump} />
    </header>
  )
}
