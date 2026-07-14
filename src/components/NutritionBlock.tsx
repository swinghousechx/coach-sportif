import type { Nutrition } from '../types'
import Icon from './Icon'

// Bloc nutrition du jour : calories cibles, plancher protéines, note contextuelle.
export default function NutritionBlock({ nutrition }: { nutrition: Nutrition }) {
  const { calories, proteinG, note } = nutrition
  const hasFigures = calories != null || proteinG != null

  return (
    <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon name="flame" size={15} className="text-run" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Nutrition
        </span>
      </div>

      {hasFigures && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {calories != null && (
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tabular-nums text-white">{calories}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">kcal</span>
            </span>
          )}
          {proteinG != null && (
            <span className="flex items-baseline gap-1.5">
              <Icon name="protein" size={14} className="translate-y-[1px] text-gym" />
              <span className="font-display text-lg font-bold tabular-nums text-white">≥{proteinG}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">g prot.</span>
            </span>
          )}
        </div>
      )}

      {note && <p className="mt-1.5 text-pretty text-[12px] leading-snug text-white/65">{note}</p>}
    </div>
  )
}
