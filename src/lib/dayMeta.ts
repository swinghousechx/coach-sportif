import type { DayType } from '../types'

export type Accent = 'run' | 'gym' | 'rest'

/** Famille d'accent d'un jour : course (orange), muscu (lime), repos (neutre). */
export function accentFor(type: DayType): Accent {
  if (type === 'gym' || type === 'gym_and_run') return 'gym'
  if (type === 'rest_or_easy') return 'rest'
  return 'run' // run, long_run, hike, race
}

export const ACCENT_CSS: Record<Accent, string> = {
  run: 'var(--run)',
  gym: 'var(--gym)',
  rest: 'rgba(255,255,255,0.35)'
}
export const ACCENT_TEXT: Record<Accent, string> = {
  run: 'text-run',
  gym: 'text-gym',
  rest: 'text-white/60'
}
export const ACCENT_BG: Record<Accent, string> = {
  run: 'bg-run/15',
  gym: 'bg-gym/15',
  rest: 'bg-white/10'
}
export const ACCENT_RING: Record<Accent, string> = {
  run: 'ring-run/70',
  gym: 'ring-gym/70',
  rest: 'ring-white/40'
}

export function typeLabel(type: DayType): string {
  switch (type) {
    case 'gym':
      return 'Salle'
    case 'gym_and_run':
      return 'Salle + Course'
    case 'run':
      return 'Course'
    case 'long_run':
      return 'Sortie longue'
    case 'hike':
      return 'Rando'
    case 'rest_or_easy':
      return 'Repos'
    case 'race':
      return 'Course'
  }
}

export type IconName =
  | 'dumbbell'
  | 'activity'
  | 'route'
  | 'mountain'
  | 'moon'
  | 'flag'

export function typeIcon(type: DayType): IconName {
  switch (type) {
    case 'gym':
    case 'gym_and_run':
      return 'dumbbell'
    case 'run':
      return 'activity'
    case 'long_run':
      return 'route'
    case 'hike':
      return 'mountain'
    case 'rest_or_easy':
      return 'moon'
    case 'race':
      return 'flag'
  }
}

/** Couleur du badge de phase, dans la palette existante. */
export function phaseTone(phase: string): string {
  const p = phase.toLowerCase()
  if (p.startsWith('peak') || p.startsWith('affûtage') || p.startsWith('affutage')) return 'text-run'
  if (p.startsWith('taper')) return 'text-amber-400'
  if (p.startsWith('deload')) return 'text-white/70'
  return 'text-gym' // Build / Consolidation
}
