import { useEffect, useState } from 'react'
import { fetchEtatAuto, loadEtat, saveEtat, type DailyState } from '../lib/coach'
import { IconBadge } from './ui'

// État du jour : ce qui se MESURE (FC de repos, durée de sommeil) arrive tout seul
// d'Apple Santé via le raccourci iOS ; ce qui se RESSENT (qualité du sommeil, fatigue)
// reste saisi à la main — aucun capteur ne sait comment tu te sens.
export default function EtatDuJour({ date }: { date: string }) {
  const [etat, setEtat] = useState<DailyState>(() => loadEtat(date) ?? {})

  function update(patch: Partial<DailyState>) {
    const next = { ...etat, ...patch }
    setEtat(next)
    saveEtat(date, next)
  }

  // Le mesuré pré-remplit, la saisie manuelle gagne toujours : une valeur corrigée
  // à la main ne doit jamais être écrasée au rechargement suivant.
  useEffect(() => {
    let annule = false
    fetchEtatAuto(date).then((auto) => {
      if (!auto || annule) return
      const local = loadEtat(date) ?? {}
      const patch: Partial<DailyState> = {}
      if (auto.hrRest != null && local.hrRest == null) {
        patch.hrRest = Math.round(auto.hrRest)
        patch.hrRestSource = 'auto'
      }
      if (auto.sleepHours != null && local.sleepHours == null) patch.sleepHours = auto.sleepHours
      if (!Object.keys(patch).length) return
      const next = { ...local, ...patch }
      setEtat(next)
      saveEtat(date, next)
    })
    return () => {
      annule = true
    }
  }, [date])

  return (
    <div className="glass p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <IconBadge name="heart" size={34} tone="run" />
        <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
          État du jour
        </span>
      </div>

      {/* Sommeil */}
      <Row
        label={
          <>
            Sommeil
            {etat.sleepHours != null && (
              <span className="mt-0.5 block text-[11px] leading-none text-white/60">
                {fmtDuree(etat.sleepHours)} mesurées
              </span>
            )}
          </>
        }
      >
        <div className="flex gap-1.5">
          {(['bien', 'moyen', 'mauvais'] as const).map((v) => (
            <Chip key={v} active={etat.sommeil === v} onClick={() => update({ sommeil: v })}>
              {v}
            </Chip>
          ))}
        </div>
      </Row>

      {/* Fatigue 1→5 — le sens de l'échelle doit être lisible sans le demander. */}
      <Row
        label={
          <>
            Fatigue
            <span className="mt-0.5 block text-[11px] leading-none text-white/60">
              1 frais → 5 cuit
            </span>
          </>
        }
      >
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ fatigue: n })}
              aria-pressed={etat.fatigue === n}
              className={[
                'focus-ring h-11 w-11 rounded-full border text-[13px] font-semibold tabular-nums transition-colors',
                etat.fatigue === n
                  ? 'border-run bg-run/20 text-run'
                  : 'border-white/15 bg-white/5 text-white/60 hover:text-white/80'
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
            onChange={(e) =>
              update({
                hrRest: e.target.value ? Number(e.target.value) : undefined,
                hrRestSource: undefined // corrigée à la main : ce n'est plus la valeur mesurée
              })
            }
            placeholder="—"
            className="focus-ring w-16 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-center font-display text-base font-bold tabular-nums text-white placeholder:text-white/60"
          />
          <span className="text-[12px] text-white/60">bpm</span>
          {etat.hrRestSource === 'auto' && (
            <span className="badge bg-gym/15 text-gym">Auto</span>
          )}
        </div>
      </Row>

      <p className="mt-1 text-pretty text-[11px] leading-snug text-white/60">
        {etat.hrRestSource === 'auto'
          ? 'FC de repos et sommeil lus depuis Apple Santé (ta Garmin les y écrit). Corrige librement : ta saisie prime.'
          : 'FC de repos et sommeil peuvent arriver seuls depuis Apple Santé — voir le raccourci iOS. Le ressenti, lui, n’appartient qu’à toi.'}
      </p>
    </div>
  )
}

/** 7.53 h → « 7 h 32 » : on lit une nuit en heures et minutes, pas en décimales. */
function fmtDuree(h: number): string {
  const t = Math.round(h * 60)
  return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')}`
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
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
        'focus-ring min-h-[44px] rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors',
        active ? 'border-gym bg-gym/15 text-gym' : 'border-white/15 bg-white/5 text-white/60 hover:text-white/80'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
