export type TabKey = 'week' | 'plan' | 'reco'

interface Props {
  value: TabKey
  onChange: (t: TabKey) => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'plan', label: 'Programme' },
  // La clé reste 'reco' : le retour OAuth Strava pointe sur #reco.
  { key: 'reco', label: 'Coach' }
]

// Segmented control en verre, dans le style existant.
export default function Tabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Vues du programme" className="glass mb-4 grid grid-cols-3 gap-1 p-1">
      {TABS.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={[
              'focus-ring rounded-2xl px-2 py-2.5 font-display text-[13px] font-semibold uppercase tracking-widest transition-colors duration-200',
              active ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/75'
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
