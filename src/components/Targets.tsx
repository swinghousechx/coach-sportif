import type { Day, Program } from '../types'
import { loadProfil } from '../lib/coach'
import { computeZones, medianHrRest, targetsFor } from '../lib/zones'
import Icon from './Icon'
import { IconBadge, Tile, TileLabel } from './ui'

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
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 pl-1">
        <Icon name="target" size={14} className="text-white/45" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Cibles
        </span>
        {zones && (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-white/30">
            {zones.method === 'karvonen' ? 'réserve cardiaque' : '% FC max'}
          </span>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {targets.map((t, i) => (
          <Tile key={i} className="p-3.5">
            <li>
              <div className="mb-3 flex items-start gap-2">
                <IconBadge name={t.icon} size={28} />
                <TileLabel>{t.label}</TileLabel>
              </div>
              <p className="font-display text-[19px] font-bold leading-none tracking-tight text-white">
                {t.value}
              </p>
              {t.hint && (
                <p className="mt-1.5 text-pretty text-[11px] leading-snug text-white/40">{t.hint}</p>
              )}
            </li>
          </Tile>
        ))}
      </ul>

      {!zones && (
        <p className="mt-2 pl-1 text-[11px] leading-snug text-white/35">
          Cibles FC indisponibles : connecte Strava et synchronise ton profil dans l’onglet Coach.
        </p>
      )}
    </div>
  )
}
