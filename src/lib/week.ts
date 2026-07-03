// Utilitaires de date : semaine ISO + index du jour courant.

/** Clé de semaine ISO, ex. "2026-W27". Sert à réinitialiser les coches. */
export function isoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Jeudi de la semaine courante détermine l'année ISO.
  const dayNum = (d.getUTCDay() + 6) % 7 // lundi=0 … dimanche=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const DAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi'
]

/** Renvoie le nom du jour courant en minuscules, ex. "lundi". */
export function todayName(date = new Date()): string {
  return DAY_NAMES[date.getDay()]
}

/** true si la date d'échéance du bloc est dépassée (fin de journée). */
export function isBlockExpired(validUntil: string, now = new Date()): boolean {
  const end = new Date(`${validUntil}T23:59:59`)
  if (Number.isNaN(end.getTime())) return false
  return now.getTime() > end.getTime()
}
