import type { Program } from '../types'
import { loadProfil } from '../lib/coach'
import { readiness, type Verdict } from '../lib/readiness'
import { countdownLabel, todayISO } from '../lib/week'
import Icon from './Icon'
import { IconBadge, TileLabel } from './ui'

// « Suis-je dans les clous ? » — des faits mesurés face aux exigences du plan.
// Pas de chrono prédit : voir lib/readiness.ts.
export default function ReadinessCard({ program }: { program: Program }) {
  const profil = loadProfil()
  const axes = readiness(program, profil, todayISO())
  if (!axes.length) return null

  return (
    <div className="glass p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <IconBadge name="flag" size={34} tone="run" />
        <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
          Prêt pour {countdownLabel(program.raceDate)} ?
        </span>
      </div>
      <p className="mb-4 text-[12.5px] leading-snug text-white/60">
        Où tu en es, face aux exigences de ton plan. Pas un chrono prédit — des faits.
      </p>

      <ul className="flex flex-col gap-2">
        {axes.map((a) => (
          <li
            key={a.key}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <TileLabel>{a.label}</TileLabel>
              <span className="flex items-center gap-1.5">
                <Icon name={ICON[a.verdict]} size={13} className={TONE[a.verdict]} />
                <span className={`font-display text-[15px] font-bold tabular-nums ${TONE[a.verdict]}`}>
                  {a.value}
                </span>
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-white/60">Cible : {a.target}</p>
            <p className="mt-1 text-pretty text-[12.5px] leading-snug text-white/70">{a.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

const TONE: Record<Verdict, string> = {
  ok: 'text-gym',
  'en-chemin': 'text-white/85',
  attention: 'text-run',
  inconnu: 'text-white/85'
}
const ICON: Record<Verdict, 'check' | 'trending-up' | 'alert'> = {
  ok: 'check',
  'en-chemin': 'trending-up',
  attention: 'alert',
  inconnu: 'trending-up'
}
