import { useEffect, useState } from 'react'
import {
  effectiveHrMax,
  fetchProfil,
  loadHrMaxOverride,
  loadProfil,
  saveHrMaxOverride
} from '../lib/coach'
import { computeZones, fmtPace, medianHrRest, zone, type Profil } from '../lib/zones'
import Icon from './Icon'
import { BigNumber, IconBadge, Sparkline, Tile, TileLabel } from './ui'

// Profil physiologique mesuré sur Strava → zones FC recalibrées.
// Remplace les repères « par âge » du plan de départ, que le plan lui-même
// donnait pour indicatifs en demandant une recalibration.
export default function ProfilCard() {
  const [profil, setProfil] = useState<Profil | null>(() => loadProfil())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Première ouverture : on mesure tout seul (le backend garde le résultat 12 h).
  useEffect(() => {
    if (profil) return
    run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(force: boolean) {
    setLoading(true)
    setError(null)
    try {
      setProfil(await fetchProfil(force))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur'
      setError(msg === 'not_connected' ? 'Connecte Strava d’abord.' : 'Profil indisponible, réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const [editingMax, setEditingMax] = useState(false)
  const [bump, setBump] = useState(0) // force le recalcul après un changement d'override

  const hrRest = medianHrRest()
  const override = loadHrMaxOverride()
  const hrMax = effectiveHrMax(profil)
  const zones = hrMax ? computeZones(hrMax, hrRest) : null
  // Easy au-dessus de la Z2 = les sorties faciles sont courues trop vite : on le signale.
  const aboveZ2 = !!(zones && profil?.easyHrMedian && profil.easyHrMedian > zone(zones, 'Z2').hi)
  // Un max mesuré sous ~175 sur un coureur qui prépare un marathon est presque
  // toujours le plafond de ses easy, pas son vrai maximum. On le dit franchement.
  const maxSuspect = override == null && profil?.hrMax != null && profil.hrMax < 175

  function commitMax(v: number | null) {
    saveHrMaxOverride(v)
    setEditingMax(false)
    setBump((b) => b + 1)
  }
  void bump

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <IconBadge name="target" size={34} tone="gym" />
          <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
            Mon profil
          </span>
        </div>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white/70 disabled:opacity-50"
        >
          {loading ? '…' : 'Recalculer'}
        </button>
      </div>

      {error && <p className="text-[12px] text-amber-300">{error}</p>}

      {!profil && !error && (
        <p className="text-[13px] leading-snug text-white/60">
          {loading ? 'Analyse de tes sorties…' : 'Profil non calculé.'}
        </p>
      )}

      {profil && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <HrMaxTile
              value={hrMax}
              manual={override != null}
              suspect={maxSuspect}
              editing={editingMax}
              onEdit={() => setEditingMax(true)}
              onCommit={commitMax}
            />
            <Stat
              icon="moon"
              label="FC repos"
              value={hrRest ?? '—'}
              unit={hrRest ? 'bpm' : undefined}
            />
            <Stat
              icon="activity"
              label="Easy médian"
              value={profil.easyPaceSec ? fmtPace(profil.easyPaceSec) : '—'}
              unit={profil.easyPaceSec ? '/km' : undefined}
            />
            <Stat
              icon="heart"
              label="FC easy"
              value={profil.easyHrMedian ?? '—'}
              unit={profil.easyHrMedian ? 'bpm' : undefined}
              tone={aboveZ2 ? 'run' : 'white'}
              alert={aboveZ2}
            />
            <Stat
              icon="route"
              label="Volume"
              value={profil.weeklyKm ?? '—'}
              unit={profil.weeklyKm != null ? 'km/sem' : undefined}
              viz={profil.weeklySeries?.some((v) => v > 0) ? profil.weeklySeries : undefined}
              vizKind="bars"
            />
            <Stat
              icon="mountain"
              label="Plus longue"
              value={profil.longestKm ?? '—'}
              unit={profil.longestKm != null ? 'km' : undefined}
            />
          </div>

          {zones ? (
            <>
              <p className="mb-1.5 mt-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                Zones FC · {zones.method === 'karvonen' ? 'réserve cardiaque' : '% FC max'}
              </p>
              <ul className="flex flex-col gap-1">
                {zones.zones.map((z) => (
                  <li key={z.key} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="w-6 shrink-0 font-display font-bold text-gym">{z.key}</span>
                    <span className="w-20 shrink-0 text-white/60">{z.label}</span>
                    <span className="tabular-nums text-white/85">
                      {z.lo}–{z.hi} bpm
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-[12.5px] leading-snug text-white/60">
              Pas encore de FC max exploitable sur tes sorties — les zones apparaîtront dès qu’une
              séance remontera ta fréquence cardiaque.
            </p>
          )}

          {maxSuspect && (
            <div className="mt-3 rounded-2xl border border-run/30 bg-run/[0.08] p-3">
              <p className="flex items-start gap-2 text-[12.5px] leading-snug text-white/80">
                <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-run" />
                <span>
                  <strong className="font-semibold text-white">FC max probablement sous-estimée.</strong>{' '}
                  {profil.hrMax} bpm, c’est sans doute le plafond de tes easy, pas ton vrai maximum —
                  et toutes tes zones en découlent. Touche la tuile <strong>FC max</strong> pour saisir
                  ta vraie valeur (un test en côte à fond, ou ton max connu en course).
                </span>
              </p>
            </div>
          )}

          <p className="mt-3 text-pretty text-[12.5px] leading-snug text-white/60">
            Mesuré sur {profil.runs} sorties depuis le {frDate(profil.since)}
            {profil.runsAvecFc ? `, dont ${profil.runsAvecFc} avec cardio` : ''}.
            {override != null && ' FC max réglée à la main — les zones sont calculées dessus.'}
            {!hrRest && ' Saisis ta FC repos ci-dessus : les zones passeront en réserve cardiaque, plus précises.'}
          </p>
        </>
      )}
    </div>
  )
}

// Tuile FC max éditable : l'app ne mesure que ce qu'elle voit, la saisie reprend la main.
function HrMaxTile({
  value,
  manual,
  suspect,
  editing,
  onEdit,
  onCommit
}: {
  value: number | null
  manual: boolean
  suspect: boolean
  editing: boolean
  onEdit: () => void
  onCommit: (v: number | null) => void
}) {
  const [draft, setDraft] = useState(String(value ?? ''))

  if (editing) {
    return (
      <Tile className="flex flex-col justify-between gap-3 p-3.5">
        <div className="flex items-start gap-2">
          <IconBadge name="heart" size={30} tone="gym" />
          <TileLabel>FC max</TileLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            min={120}
            max={230}
            defaultValue={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommit(Number(draft) || null)
            }}
            className="focus-ring w-16 rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-center font-display text-[22px] font-bold tabular-nums text-white"
          />
          <button
            type="button"
            onClick={() => onCommit(Number(draft) || null)}
            aria-label="Valider la FC max"
            className="focus-ring rounded-full bg-gym p-1.5 text-ink transition active:scale-90"
          >
            <Icon name="check" size={15} strokeWidth={3} />
          </button>
          {manual && (
            <button
              type="button"
              onClick={() => onCommit(null)}
              className="focus-ring text-[10px] font-semibold uppercase tracking-wide text-white/50 transition-colors hover:text-white/80"
            >
              Auto
            </button>
          )}
        </div>
      </Tile>
    )
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="focus-ring rounded-[28px] text-left"
      aria-label="Régler la FC max à la main"
    >
      <Tile className={`flex h-full flex-col justify-between gap-3 p-3.5 ${suspect ? 'ring-1 ring-run/40' : ''}`}>
        <div className="flex items-start gap-2">
          <IconBadge name="heart" size={30} tone={suspect ? 'run' : 'muted'} alert={suspect} />
          <TileLabel>FC max</TileLabel>
        </div>
        <div className="flex items-end justify-between gap-1">
          <BigNumber value={value ?? '—'} unit={value ? 'bpm' : undefined} size="sm" tone={suspect ? 'run' : 'white'} />
          <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {manual ? 'manuel' : 'régler'}
          </span>
        </div>
      </Tile>
    </button>
  )
}

// Tuile de métrique : pastille + libellé en haut, gros chiffre en bas, mini-viz à droite.
function Stat({
  icon,
  label,
  value,
  unit,
  tone = 'white',
  alert,
  viz,
  vizKind = 'line'
}: {
  icon: 'heart' | 'moon' | 'activity' | 'route' | 'mountain'
  label: string
  value: string | number
  unit?: string
  tone?: 'white' | 'run' | 'gym'
  alert?: boolean
  viz?: number[]
  vizKind?: 'line' | 'bars'
}) {
  return (
    <Tile className="flex flex-col justify-between gap-3 p-3.5">
      <div className="flex items-start gap-2">
        <IconBadge name={icon} size={30} tone={alert ? 'run' : 'muted'} alert={alert} />
        <TileLabel>{label}</TileLabel>
      </div>
      <div className="flex items-end justify-between gap-1">
        <BigNumber value={value} unit={unit} size="sm" tone={tone} />
        {viz && <Sparkline data={viz} kind={vizKind} width={38} height={18} className="text-white/25" />}
      </div>
    </Tile>
  )
}

function frDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
