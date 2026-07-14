import { useState } from 'react'
import { loadEtat, saveEtat, type DailyState } from '../lib/coach'
import Icon from './Icon'

// Récup subjective du jour (sommeil / fatigue / FC repos), passée au coach pour le débrief.
export default function EtatDuJour({ date }: { date: string }) {
  const [etat, setEtat] = useState<DailyState>(() => loadEtat(date) ?? {})

  function update(patch: Partial<DailyState>) {
    const next = { ...etat, ...patch }
    setEtat(next)
    saveEtat(date, next)
  }

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Icon name="heart" size={18} className="text-run" />
        <span className="font-display text-base font-semibold uppercase tracking-widest text-white/85">
          État du jour
        </span>
      </div>

      {/* Sommeil */}
      <Row label="Sommeil">
        <div className="flex gap-1.5">
          {(['bien', 'moyen', 'mauvais'] as const).map((v) => (
            <Chip key={v} active={etat.sommeil === v} onClick={() => update({ sommeil: v })}>
              {v}
            </Chip>
          ))}
        </div>
      </Row>

      {/* Fatigue 1→5 */}
      <Row label="Fatigue">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ fatigue: n })}
              aria-pressed={etat.fatigue === n}
              className={[
                'focus-ring h-8 w-8 rounded-full border text-[13px] font-semibold tabular-nums transition-colors',
                etat.fatigue === n
                  ? 'border-run bg-run/20 text-run'
                  : 'border-white/15 bg-white/5 text-white/50 hover:text-white/80'
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </Row>

      {/* FC repos */}
      <Row label="FC repos">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={30}
            max={120}
            value={etat.hrRest ?? ''}
            onChange={(e) => update({ hrRest: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="—"
            className="focus-ring w-16 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-center font-display text-base font-bold tabular-nums text-white placeholder:text-white/30"
          />
          <span className="text-[12px] text-white/40">bpm</span>
        </div>
      </Row>

      <p className="mt-1 text-[11px] leading-snug text-white/40">
        La FC repos vient de ta Garmin (au réveil). Le coach en tient compte dans le débrief du jour.
      </p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <span className="text-[13px] text-white/60">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'focus-ring rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors',
        active ? 'border-gym bg-gym/15 text-gym' : 'border-white/15 bg-white/5 text-white/50 hover:text-white/80'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
