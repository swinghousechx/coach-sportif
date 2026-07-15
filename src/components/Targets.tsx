import type { Day, Program } from '../types'
import { loadProfil } from '../lib/coach'
import { computeZones, medianHrRest, targetsFor } from '../lib/zones'
import Icon from './Icon'

// Cibles chiffrées de la sortie : allure, FC, dénivelé, effort.
// Dérivées du plan + du profil réel (FC max observée sur Strava, FC repos saisie).
// Sans profil mesuré, le bloc ne s'affiche pas : pas de chiffres inventés.
export default function Targets({ day, program }: { day: Day; program: Program }) {
  const profil = loadProfil()
  const hrRest = medianHrRest()
  const zones = profil?.hrMax ? computeZones(profil.hrMax, hrRest) : null
  const targets = targetsFor(day, program, profil, zones)

  if (!targets.length) return null

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon name="target" size={15} className="text-white/50" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Cibles
        </span>
        {zones && (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-white/30">
            {zones.method === 'karvonen' ? 'réserve cardiaque' : '% FC max'}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {targets.map((t, i) => (
          <li key={i} className="flex gap-2.5">
            <Icon name={t.icon} size={15} className="mt-0.5 shrink-0 text-white/35" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[12px] text-white/50">{t.label}</span>
                <span className="font-display text-[15px] font-bold tabular-nums tracking-tight text-white">
                  {t.value}
                </span>
              </div>
              {t.hint && (
                <p className="mt-0.5 text-pretty text-[11.5px] leading-snug text-white/45">{t.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!zones && (
        <p className="mt-2.5 text-[11px] leading-snug text-white/35">
          Cibles FC indisponibles : connecte Strava et synchronise ton profil dans l’onglet Coach.
        </p>
      )}
    </div>
  )
}
