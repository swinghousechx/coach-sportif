import { useEffect, useState } from 'react'
import { fetchProfil, loadProfil } from '../lib/coach'
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

  const hrRest = medianHrRest()
  const zones = profil?.hrMax ? computeZones(profil.hrMax, hrRest) : null
  // Easy au-dessus de la Z2 = les sorties faciles sont courues trop vite : on le signale.
  const aboveZ2 = !!(zones && profil?.easyHrMedian && profil.easyHrMedian > zone(zones, 'Z2').hi)

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon name="target" size={18} className="text-gym" />
          <span className="font-display text-base font-semibold uppercase tracking-widest text-white/85">
            Mon profil
          </span>
        </div>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-white/70 disabled:opacity-50"
        >
          {loading ? '…' : 'Recalculer'}
        </button>
      </div>

      {error && <p className="text-[12px] text-amber-300">{error}</p>}

      {!profil && !error && (
        <p className="text-[13px] leading-snug text-white/55">
          {loading ? 'Analyse de tes sorties…' : 'Profil non calculé.'}
        </p>
      )}

      {profil && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon="heart" label="FC max" value={profil.hrMax ?? '—'} unit={profil.hrMax ? 'bpm' : undefined} />
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
              <p className="mb-1.5 mt-3.5 font-display text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Zones FC · {zones.method === 'karvonen' ? 'réserve cardiaque' : '% FC max'}
              </p>
              <ul className="flex flex-col gap-1">
                {zones.zones.map((z) => (
                  <li key={z.key} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="w-6 shrink-0 font-display font-bold text-gym">{z.key}</span>
                    <span className="w-20 shrink-0 text-white/50">{z.label}</span>
                    <span className="tabular-nums text-white/85">
                      {z.lo}–{z.hi} bpm
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-[11.5px] leading-snug text-white/40">
              Pas encore de FC max exploitable sur tes sorties — les zones apparaîtront dès qu’une
              séance remontera ta fréquence cardiaque.
            </p>
          )}

          <p className="mt-3 text-pretty text-[11px] leading-snug text-white/35">
            Mesuré sur {profil.runs} sorties depuis le {frDate(profil.since)}
            {profil.runsAvecFc ? `, dont ${profil.runsAvecFc} avec cardio` : ''}.
            {!hrRest && ' Saisis ta FC repos ci-dessus : les zones passeront en réserve cardiaque, plus précises.'}
          </p>
        </>
      )}
    </div>
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
