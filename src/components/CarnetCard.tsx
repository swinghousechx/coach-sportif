import { removeCarnetEntry, type CarnetEntry, type CarnetType } from '../lib/carnet'
import Icon from './Icon'
import { IconBadge, TileLabel } from './ui'

// Ce que le coach retient de toi, entre deux séances.
// Visible et effaçable : sa mémoire ne doit jamais être une boîte noire.
export default function CarnetCard({
  entries,
  onChange
}: {
  entries: CarnetEntry[]
  onChange: () => void
}) {
  const ouvertes = entries.filter((e) => e.status === 'ouvert')

  return (
    <div className="glass p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <IconBadge name="inbox" size={34} tone="gym" />
        <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
          Carnet du coach
        </span>
      </div>

      {ouvertes.length === 0 ? (
        <p className="text-pretty text-[13px] leading-snug text-white/60">
          Rien de noté pour l’instant. Le coach y inscrit ce qu’il doit retenir d’une fois sur
          l’autre — une douleur, une habitude qu’il repère, une décision prise ensemble — et s’en
          sert au débrief suivant.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ouvertes.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
            >
              <Icon name={ICON[e.type]} size={15} className={`mt-0.5 shrink-0 ${TONE[e.type]}`} />
              <div className="min-w-0 flex-1">
                <TileLabel>{LABEL[e.type]}</TileLabel>
                <p className="mt-1 text-pretty text-[13px] leading-snug text-white/85">{e.text}</p>
                <p className="mt-1 text-[11px] text-white/60">depuis le {frDate(e.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeCarnetEntry(e.id)
                  onChange()
                }}
                aria-label={`Effacer : ${e.text}`}
                className="focus-ring -m-1 shrink-0 rounded-full p-1 text-white/60 transition-colors hover:text-white/90"
              >
                <Icon name="check" size={14} strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const LABEL: Record<CarnetType, string> = {
  douleur: 'Douleur',
  schema: 'Tendance',
  decision: 'Décision',
  objectif: 'Objectif'
}
const ICON: Record<CarnetType, 'alert' | 'trending-up' | 'flag' | 'check'> = {
  douleur: 'alert',
  schema: 'trending-up',
  decision: 'check',
  objectif: 'flag'
}
const TONE: Record<CarnetType, string> = {
  douleur: 'text-run',
  schema: 'text-gym',
  decision: 'text-white/60',
  objectif: 'text-run'
}

function frDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
