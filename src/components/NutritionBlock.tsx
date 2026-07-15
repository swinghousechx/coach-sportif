import type { Nutrition } from '../types'
import Icon from './Icon'
import { BigNumber, IconBadge, Tile, TileLabel } from './ui'

// Nutrition du jour : deux tuiles jumelles (apport / plancher protéines) + la note.
export default function NutritionBlock({ nutrition }: { nutrition: Nutrition }) {
  const { calories, proteinG, note } = nutrition
  if (calories == null && proteinG == null && !note) return null

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 pl-1">
        <Icon name="flame" size={14} className="text-run" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Nutrition
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {calories != null && (
          <Tile className="p-3.5">
            <div className="mb-3 flex items-start gap-2">
              <IconBadge name="flame" size={28} tone="run" />
              <TileLabel>Apport</TileLabel>
            </div>
            <BigNumber value={calories} unit="kcal" size="sm" />
          </Tile>
        )}
        {proteinG != null && (
          <Tile className="p-3.5">
            <div className="mb-3 flex items-start gap-2">
              <IconBadge name="protein" size={28} tone="gym" />
              <TileLabel>Protéines</TileLabel>
            </div>
            <BigNumber value={`≥${proteinG}`} unit="g" size="sm" />
          </Tile>
        )}
      </div>

      {note && <p className="mt-2 text-pretty pl-1 text-[12px] leading-snug text-white/60">{note}</p>}
    </div>
  )
}
