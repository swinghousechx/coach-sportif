// Jeu d'icônes cohérent (stroke 24×24, currentColor) — remplace les emoji dépareillés.
import type { SVGProps } from 'react'

type Name =
  | 'activity'
  | 'dumbbell'
  | 'flame'
  | 'trending-up'
  | 'alert'
  | 'upload'
  | 'check'
  | 'chevron'
  | 'inbox'

const PATHS: Record<Name, JSX.Element> = {
  // Ligne de rythme cardio — la course / l'effort.
  activity: <path d="M3 12h4l2.5 7 5-16 2.5 9H21" />,
  // Haltère — la salle.
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11" />
    </>
  ),
  // Flamme — nutrition / énergie.
  flame: (
    <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.7-2.8 1.4-3.6.3 1.3 1.1 1.8 1.6 1.9C10.2 8.7 12 6.5 12 3Z" />
  ),
  // Courbe montante — progression.
  'trending-up': (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  // Triangle d'alerte — vigilance.
  alert: (
    <>
      <path d="M10.3 4.3 2.4 18a1.6 1.6 0 0 0 1.4 2.4h16.4A1.6 1.6 0 0 0 21.6 18L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 6.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-5.5A2 2 0 0 0 16.8 5H7.2a2 2 0 0 0-1.7 1.5Z" />
    </>
  )
}

interface Props extends SVGProps<SVGSVGElement> {
  name: Name
  size?: number
}

export default function Icon({ name, size = 20, strokeWidth = 2, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
