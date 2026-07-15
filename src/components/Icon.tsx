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
  | 'route'
  | 'mountain'
  | 'heart'
  | 'external'
  | 'flag'
  | 'moon'
  | 'protein'
  | 'refresh'
  | 'message'
  | 'send'

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
  ),
  // Distance de course — jalons sur un tracé.
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5" />
    </>
  ),
  // Dénivelé — sommet.
  mountain: <path d="M3 20h18L14 6l-3.5 6.5L8 9l-5 11Z" />,
  // Fréquence cardiaque.
  heart: (
    <path d="M12 20.5S3.5 14.6 3.5 8.9A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.5 2c0 5.7-8.5 11.6-8.5 11.6Z" />
  ),
  // Lien externe (Strava).
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  // Drapeau — jour de course.
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 3.5L16 11H5" />
    </>
  ),
  // Repos.
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z" />,
  // Protéines — plancher (icône bouclier).
  protein: <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" />,
  // Rafraîchir — flèche circulaire.
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </>
  ),
  // Parler au coach — bulle de conversation.
  message: <path d="M21 11.5a8 8 0 0 1-8 8H8l-5 3 1.2-4.4A8 8 0 1 1 21 11.5Z" />,
  // Envoyer — flèche montante.
  send: (
    <>
      <path d="M12 20V5" />
      <path d="M6 11l6-6 6 6" />
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
