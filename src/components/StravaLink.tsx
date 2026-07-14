import type { Day } from '../types'
import Icon from './Icon'

// Version simplifiée (pas d'OAuth sur un hébergement statique) :
// un lien qui ouvre le journal Strava pour vérifier la séance à la main.
// Si `day.strava` est rempli (sync backend futur), on affiche le résumé réel vs prévu.
const STRAVA_LOG = 'https://www.strava.com/athlete/training'

export default function StravaLink({ day }: { day: Day }) {
  const s = day.strava

  return (
    <div className="mt-3">
      {s ? (
        <div className="rounded-2xl border border-run/25 bg-run/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <StravaMark />
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-run">
              Synchronisé Strava
            </span>
          </div>
          <dl className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Dist." value={`${s.distanceKm} km`} />
            <Stat label="D+" value={`${s.elevationM} m`} />
            <Stat label="FC moy." value={s.avgHr ? `${s.avgHr}` : '—'} />
            <Stat label="Allure" value={s.avgPace ?? '—'} />
          </dl>
          <a
            href={`https://www.strava.com/activities/${s.activityId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-run/90 hover:text-run"
          >
            Voir l'activité <Icon name="external" size={14} />
          </a>
        </div>
      ) : (
        <a
          href={STRAVA_LOG}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-run/25 bg-run/10 px-3.5 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-run transition-colors hover:bg-run/15"
        >
          <StravaMark />
          Vérifier sur Strava
          <Icon name="external" size={14} />
        </a>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-sm font-bold tabular-nums text-white">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-white/45">{label}</div>
    </div>
  )
}

// Petit logo Strava (chevron) en couleur d'accent.
function StravaMark() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true" className="text-run">
      <path d="M13.8 2 7.3 14.6h3.9L13.8 9l2.6 5.6h3.8L13.8 2Zm2.6 12.6-1.9 3.7-1.9-3.7H9.9L14.5 24l4.6-9.4h-2.7Z" />
    </svg>
  )
}
