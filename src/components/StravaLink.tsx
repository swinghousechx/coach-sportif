import type { StravaSummary } from '../types'
import { parseHevyDescription } from '../lib/hevy'
import Icon from './Icon'

// Version simplifiée (pas d'OAuth sur un hébergement statique) :
// tant qu'il n'y a pas de sync backend, on affiche un lien "Vérifier sur Strava".
// Dès que `summary` est rempli (sync futur), on montre le résumé réel — course OU muscu
// (Hevy remonte la muscu en WeightTraining avec exercices/charges dans la description).
const STRAVA_LOG = 'https://www.strava.com/athlete/training'

export default function StravaLink({ summary }: { summary?: StravaSummary }) {
  if (!summary) return <VerifyButton />
  return summary.sportType === 'run' ? <RunSynced s={summary} /> : <WeightSynced s={summary} />
}

function VerifyButton() {
  return (
    <a
      href={STRAVA_LOG}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-run/25 bg-run/10 px-3.5 min-h-[44px] py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-run transition-colors hover:bg-run/15"
    >
      <StravaMark />
      Vérifier sur Strava
      <Icon name="external" size={14} />
    </a>
  )
}

function SyncedShell({ s, children }: { s: StravaSummary; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-run/25 bg-run/10 p-3">
      <div className="mb-2 flex items-center gap-2">
        <StravaMark />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-run">
          Synchronisé Strava
        </span>
      </div>
      {children}
      <a
        href={`https://www.strava.com/activities/${s.activityId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring mt-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-run/90 hover:text-run"
      >
        Voir l'activité <Icon name="external" size={14} />
      </a>
    </div>
  )
}

function RunSynced({ s }: { s: StravaSummary }) {
  return (
    <SyncedShell s={s}>
      <dl className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Dist." value={s.distanceKm != null ? `${s.distanceKm} km` : '—'} />
        <Stat label="D+" value={s.elevationM != null ? `${s.elevationM} m` : '—'} />
        <Stat label="FC moy." value={s.avgHr ? `${s.avgHr}` : '—'} />
        <Stat label="Allure" value={s.avgPace ?? '—'} />
      </dl>
    </SyncedShell>
  )
}

// Muscu réalisée (parsée depuis la description Hevy) — à comparer aux exercices planifiés au-dessus.
function WeightSynced({ s }: { s: StravaSummary }) {
  // Exercices déjà parsés, sinon parsés à la volée depuis la description Hevy brute.
  const ex = s.exercises ?? parseHevyDescription(s.description ?? '')
  return (
    <SyncedShell s={s}>
      {ex.length > 0 ? (
        <>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/60">Réalisé</div>
          <ul className="divide-y divide-white/5">
            {ex.map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate text-[13px] text-white/85">{e.name}</span>
                <span className="shrink-0 text-right">
                  {e.topWeight && (
                    <span className="font-display text-sm font-bold tabular-nums text-run">{e.topWeight}</span>
                  )}
                  {e.reps && <span className="ml-2 text-[11px] tabular-nums text-white/60">{e.reps}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[12px] text-white/60">Séance muscu enregistrée.</p>
      )}
    </SyncedShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-sm font-bold tabular-nums text-white">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-white/60">{label}</div>
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
