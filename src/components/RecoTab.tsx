import { useEffect, useMemo, useState } from 'react'
import type { Adaptation, Program } from '../types'
import type { CarnetEntry } from '../lib/carnet'
import { coachStatus, isCoachEnabled, stravaConnectUrl } from '../lib/coach'
import BriefingCard from './BriefingCard'
import CarnetCard from './CarnetCard'
import ChatCoach from './ChatCoach'
import EtatDuJour from './EtatDuJour'
import ProfilCard from './ProfilCard'
import Icon from './Icon'

const STRAVA_LOG = 'https://www.strava.com/athlete/training'

interface Props {
  program: Program
  todayDate: string
  onApplyAdaptation: (a: Adaptation) => void
  carnet: CarnetEntry[]
  onCarnetChange: () => void
}

// Onglet Coach : synchro Strava, état du jour, conversation avec le coach,
// et briefing de la séance du jour à la demande.
export default function RecoTab({ program, todayDate, onApplyAdaptation, carnet, onCarnetChange }: Props) {

  // Séance du jour, sinon la prochaine séance à venir.
  const resolved = useMemo(() => {
    const flat = program.weeks.flatMap((w) => w.days.map((d) => ({ day: d, week: w })))
    let i = flat.findIndex((x) => x.day.date === todayDate)
    let isToday = true
    if (i < 0) {
      i = flat.findIndex((x) => x.day.date >= todayDate)
      isToday = false
    }
    if (i < 0) i = flat.length - 1
    return { entry: flat[i], tomorrow: flat[i + 1]?.day, isToday }
  }, [program, todayDate])

  return (
    <div className="flex flex-col gap-4">
      {/* Synchro Strava */}
      <StravaCard />

      {/* État du jour (récup subjective + FC repos → pris en compte par le coach) */}
      {isCoachEnabled() && <EtatDuJour date={todayDate} />}

      {/* Profil mesuré sur Strava → zones FC recalibrées, cibles de chaque sortie */}
      {isCoachEnabled() && <ProfilCard />}

      {/* Conversation avec le coach (douleur, fatigue, adaptation de séance) */}
      {isCoachEnabled() && resolved.entry && (
        <ChatCoach
          day={resolved.entry.day}
          week={resolved.entry.week}
          program={program}
          tomorrow={resolved.tomorrow}
          today={todayDate}
          onApply={onApplyAdaptation}
          onCarnet={onCarnetChange}
        />
      )}

      {/* Ce que le coach retient de toi — visible, effaçable. */}
      {isCoachEnabled() && <CarnetCard entries={carnet} onChange={onCarnetChange} />}

      {/* Le brief d'avant-séance : le troisième temps, après le débrief et le chat. */}
      {isCoachEnabled() && resolved.entry && (
        <BriefingCard
          day={resolved.entry.day}
          week={resolved.entry.week}
          program={program}
          isToday={resolved.isToday}
          onApply={onApplyAdaptation}
          onCarnet={onCarnetChange}
        />
      )}
    </div>
  )
}

// Carte Strava : bouton de connexion réel si le backend est branché, sinon lien simplifié.
function StravaCard() {
  const enabled = isCoachEnabled()
  const [connected, setConnected] = useState<boolean | null>(enabled ? null : false)

  useEffect(() => {
    if (enabled) coachStatus().then(setConnected)
  }, [enabled])

  return (
    <div className="glass p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-run/40">
          <StravaMark size={16} />
        </span>
        <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
          Strava
        </span>
        {enabled && connected && (
          <span className="badge bg-emerald-400/15 text-emerald-300">Connecté</span>
        )}
      </div>

      {enabled ? (
        connected ? (
          <p className="mt-1.5 text-[13px] leading-snug text-white/60">
            Compte connecté. Touche « Débrief du coach » sur une séance pour analyser le réalisé.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[13px] leading-snug text-white/60">
              Connecte ton compte pour que le coach analyse tes séances réelles (course + muscu Hevy).
            </p>
            <a
              href={stravaConnectUrl()}
              className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-run/25 bg-run/10 px-3.5 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-run transition-colors hover:bg-run/15"
            >
              <StravaMark size={14} />
              Connecter Strava
              <Icon name="external" size={14} />
            </a>
          </>
        )
      ) : (
        <>
          <p className="mt-1.5 text-[13px] leading-snug text-white/60">
            Sync auto (course + muscu Hevy) bientôt. Pour l'instant, ouvre ton journal pour pointer la séance.
          </p>
          <a
            href={STRAVA_LOG}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-run/25 bg-run/10 px-3.5 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-run transition-colors hover:bg-run/15"
          >
            <StravaMark size={14} />
            Synchroniser Strava
            <Icon name="external" size={14} />
          </a>
        </>
      )}
    </div>
  )
}


function StravaMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="text-run">
      <path d="M13.8 2 7.3 14.6h3.9L13.8 9l2.6 5.6h3.8L13.8 2Zm2.6 12.6-1.9 3.7-1.9-3.7H9.9L14.5 24l4.6-9.4h-2.7Z" />
    </svg>
  )
}
