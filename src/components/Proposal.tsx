import { motion } from 'framer-motion'
import type { Adaptation } from '../types'
import { typeLabel } from '../lib/dayMeta'
import Icon from './Icon'

// Proposition de modification du plan. Tant que l'athlète n'a pas tranché,
// le plan n'a pas bougé — c'est le clic sur « Appliquer » qui décide.
export default function Proposal({
  adaptation,
  decision,
  onDecide
}: {
  adaptation: Adaptation
  decision?: 'applied' | 'ignored'
  onDecide: (d: 'applied' | 'ignored') => void
}) {
  const stats = [
    adaptation.distanceKm ? `${adaptation.distanceKm} km` : null,
    adaptation.elevationM ? `${adaptation.elevationM} m D+` : null
  ].filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl border border-white/15 bg-white/[0.05] p-3.5"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon name="refresh" size={14} className="text-white/50" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Modifier le programme
        </span>
      </div>

      <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-white/60">
        {frLong(adaptation.date)} · {typeLabel(adaptation.type)}
      </p>
      <p className="mt-0.5 text-balance font-display text-[17px] font-semibold leading-tight text-white">
        {adaptation.titre}
      </p>
      <p className="mt-1 text-pretty text-[13px] leading-snug text-white/75">{adaptation.description}</p>
      {stats.length > 0 && (
        <p className="mt-1.5 text-[12px] tabular-nums text-white/60">{stats.join(' · ')}</p>
      )}
      <p className="mt-1.5 text-pretty text-[12.5px] leading-snug text-white/60">{adaptation.raison}</p>

      {decision === 'applied' ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300">
          <Icon name="check" size={14} strokeWidth={3} />
          Appliqué à ton programme
        </p>
      ) : decision === 'ignored' ? (
        <p className="mt-3 text-[12px] text-white/60">Proposition ignorée — ton plan n’a pas bougé.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onDecide('applied')}
            className="focus-ring flex-1 rounded-full bg-gym px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-ink transition active:scale-[0.98]"
          >
            Appliquer
          </button>
          <button
            type="button"
            onClick={() => onDecide('ignored')}
            className="focus-ring rounded-full border border-white/15 px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white/80"
          >
            Ignorer
          </button>
        </div>
      )}
    </motion.div>
  )
}

function frLong(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
}
