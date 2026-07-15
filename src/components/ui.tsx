import type { ReactNode } from 'react'
import Icon from './Icon'

// Primitives du langage visuel « bento » : tuiles très arrondies, pastilles d'icônes
// en cercle fin, boutons flèche circulaires, très gros chiffres à unité discrète,
// et une surface héros en dégradé mesh grainé.
//
// Les couleurs restent celles de la marque : ink #0A0A0B, run #FC4C02, gym #B9FF3C.

/** Grain fin superposé aux dégradés — casse le côté « aplat numérique ». */
export const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"

/** Dégradés mesh par accent. Chauds et profonds, jamais des aplats. */
export const MESH: Record<'run' | 'gym' | 'neutral', string> = {
  run: [
    'radial-gradient(85% 95% at 12% 18%, rgba(252,76,2,0.62), transparent 62%)',
    'radial-gradient(70% 80% at 88% 22%, rgba(255,158,60,0.34), transparent 60%)',
    'radial-gradient(95% 90% at 60% 105%, rgba(120,90,180,0.28), transparent 62%)',
    'linear-gradient(145deg, #211a18, #0a0a0b)'
  ].join(','),
  gym: [
    'radial-gradient(85% 95% at 15% 20%, rgba(185,255,60,0.45), transparent 62%)',
    'radial-gradient(70% 80% at 88% 25%, rgba(90,200,160,0.30), transparent 60%)',
    'radial-gradient(95% 90% at 55% 105%, rgba(60,90,140,0.30), transparent 62%)',
    'linear-gradient(145deg, #1b2016, #0a0a0b)'
  ].join(','),
  neutral: [
    'radial-gradient(85% 95% at 15% 20%, rgba(120,140,190,0.38), transparent 62%)',
    'radial-gradient(70% 80% at 88% 25%, rgba(200,170,140,0.24), transparent 60%)',
    'linear-gradient(145deg, #17181c, #0a0a0b)'
  ].join(',')
}

/**
 * Surface en dégradé mesh floutée + grain.
 *
 * Le dégradé est posé sur une couche à part, réellement floutée puis débordée
 * (scale) : un blur laisse des bords délavés, l'agrandissement les pousse hors
 * du cadre. C'est ce qui donne le flou « optique » plutôt que des aplats étalés.
 */
export function Mesh({
  accent = 'neutral',
  className = '',
  intensity = 1,
  blur = 34,
  children
}: {
  accent?: 'run' | 'gym' | 'neutral'
  className?: string
  /** 0 → 1 : dosage du dégradé, pour les surfaces qui doivent rester discrètes. */
  intensity?: number
  blur?: number
  children: ReactNode
}) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[28px] bg-ink ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: MESH[accent],
          filter: `blur(${blur}px)`,
          transform: 'scale(1.35)',
          opacity: intensity
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: GRAIN_URL }}
      />
      {children}
    </div>
  )
}

/** Tuile mate — le pendant sombre des cartes blanches de la référence. */
export function Tile({
  className = '',
  children
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.08] bg-white/[0.055] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

/** Pastille d'icône : cercle fin, trait léger. */
export function IconBadge({
  name,
  tone = 'muted',
  size = 40,
  alert = false
}: {
  name: Parameters<typeof Icon>[0]['name']
  tone?: 'muted' | 'run' | 'gym' | 'ink'
  size?: number
  alert?: boolean
}) {
  const tones = {
    muted: 'border-white/20 text-white/60',
    run: 'border-run/40 text-run',
    gym: 'border-gym/40 text-gym',
    ink: 'border-ink/20 text-ink'
  }
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border ${tones[tone]}`}
      style={{ width: size, height: size }}
    >
      <Icon name={name} size={Math.round(size * 0.42)} strokeWidth={1.6} />
      {alert && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-run text-[8px] font-bold leading-none text-white">
          !
        </span>
      )}
    </span>
  )
}

/** Bouton flèche circulaire (↗) — l'affordance « ouvrir » de la référence. */
export function ArrowButton({
  onClick,
  label,
  tone = 'light',
  size = 40,
  expanded
}: {
  onClick: () => void
  label: string
  tone?: 'light' | 'dark'
  size?: number
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={`focus-ring inline-flex shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
        tone === 'light' ? 'bg-white text-ink' : 'bg-ink text-white'
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.45)}
        height={Math.round(size * 0.45)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)]"
        style={{ transform: expanded ? 'rotate(135deg)' : 'rotate(0deg)' }}
      >
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    </button>
  )
}

/**
 * Très gros chiffre à unité discrète — la signature typographique de la référence
 * (« 100 % », « $64,100 »). L'unité est petite et grise, la valeur domine.
 */
export function BigNumber({
  value,
  unit,
  prefix,
  size = 'md',
  tone = 'white'
}: {
  value: string | number
  unit?: string
  prefix?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'white' | 'run' | 'gym' | 'ink'
}) {
  const sizes = { sm: 'text-[26px]', md: 'text-[38px]', lg: 'text-[52px]' }
  const units = { sm: 'text-[13px]', md: 'text-[16px]', lg: 'text-[20px]' }
  const tones = { white: 'text-white', run: 'text-run', gym: 'text-gym', ink: 'text-ink' }
  const muted = tone === 'ink' ? 'text-ink/40' : 'text-white/40'

  return (
    <p className={`flex items-baseline font-display font-bold leading-none tracking-tight ${tones[tone]}`}>
      {prefix && <span className={`${units[size]} ${muted} mr-0.5 font-semibold`}>{prefix}</span>}
      <span className={`${sizes[size]} tabular-nums`}>{value}</span>
      {unit && <span className={`${units[size]} ${muted} ml-1 font-semibold`}>{unit}</span>}
    </p>
  )
}

/** Libellé de tuile : petites capitales espacées. */
export function TileLabel({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ink' }) {
  return (
    <span
      className={`font-display text-[12px] font-semibold uppercase leading-tight tracking-[0.1em] ${
        tone === 'ink' ? 'text-ink/70' : 'text-white/60'
      }`}
    >
      {children}
    </span>
  )
}

/**
 * Mini-viz tracée à main levée, comme les sparklines de la référence.
 * Purement décorative : elle illustre une série déjà chiffrée à côté, et n'est
 * jamais le seul porteur d'une information.
 */
export function Sparkline({
  data,
  kind = 'line',
  className = 'text-white/35',
  width = 64,
  height = 26
}: {
  data: number[]
  kind?: 'line' | 'bars'
  className?: string
  width?: number
  height?: number
}) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const step = width / (data.length - 1 || 1)
  const y = (v: number) => height - ((v - min) / span) * (height - 3) - 1.5

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      className={className}
      aria-hidden
    >
      {kind === 'bars' ? (
        data.map((v, i) => {
          const w = Math.max(1.5, step * 0.42)
          return (
            <rect
              key={i}
              x={i * step}
              y={y(v)}
              width={w}
              height={height - y(v) - 1}
              rx={w / 2}
              fill="currentColor"
            />
          )
        })
      ) : (
        <path
          d={data.map((v, i) => `${i ? 'L' : 'M'}${i * step},${y(v)}`).join(' ')}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
