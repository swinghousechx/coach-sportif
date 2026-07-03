import { useId, useState, type ReactNode } from 'react'
import Icon from './Icon'

type IconName = 'flame' | 'trending-up' | 'alert'

interface Props {
  title: string
  icon: IconName
  tone: string // classe de couleur Tailwind, ex. "text-run"
  children: ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({
  title,
  icon,
  tone,
  children,
  defaultOpen = false
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className="glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2.5">
          <Icon name={icon} size={18} className={tone} />
          <span className="font-display text-base font-semibold uppercase tracking-widest text-white/85">
            {title}
          </span>
        </span>
        <Icon
          name="chevron"
          size={20}
          className="text-white/50 transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)]"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expand/collapse via grid-template-rows 0fr→1fr : pas d'animation de height. */}
      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out-expo)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p
            className="text-pretty border-t border-white/5 px-4 py-3.5 text-[13px] leading-relaxed text-white/75 transition-opacity duration-300"
            style={{ opacity: open ? 1 : 0 }}
          >
            {children}
          </p>
        </div>
      </div>
    </div>
  )
}
