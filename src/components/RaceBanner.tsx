import type { RaceInfo } from '../types'
import { countdownLabel, shortDate } from '../lib/week'
import { BigNumber, IconBadge, Mesh } from './ui'

interface Props {
  race: RaceInfo
  raceDate: string
}

// Carte héros : le compte à rebours course. Dégradé mesh grainé, gros chiffre à
// unité discrète — c'est l'objet le plus lourd visuellement de l'app, et le seul.
export default function RaceBanner({ race, raceDate }: Props) {
  const cd = countdownLabel(raceDate) // « J-88 » | « Aujourd'hui »…
  const days = /^J-(\d+)$/.exec(cd)?.[1]

  return (
    <Mesh accent="run" className="mb-4">
      <div className="flex flex-col gap-6 p-5">
        <div className="flex items-start justify-between gap-3">
          <IconBadge name="flag" tone="run" size={44} />
          <div className="text-right">
            <p className="font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-white/85">
              {shortDate(raceDate)} 2026
            </p>
            <p className="mt-1 text-[13px] text-white/55">
              {race.distanceKm} km · {race.elevationM} D+ · sub-{race.goalTime.replace(':00:00', 'h')}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          {days ? (
            <BigNumber value={days} prefix="J−" size="lg" />
          ) : (
            <p className="font-display text-[40px] font-bold leading-none tracking-tight text-white">
              {cd}
            </p>
          )}
          <p className="pb-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            avant la course
          </p>
        </div>
      </div>
    </Mesh>
  )
}
