// Utilitaires de date pour le plan marathon (dates absolues, pas de semaine ISO).
import type { Program, Week } from '../types'

/** Date locale au format "YYYY-MM-DD". */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Index de la semaine courante : celle qui contient today, sinon la 1re à venir / la dernière. */
export function currentWeekIndex(weeks: Week[], iso = todayISO()): number {
  if (weeks.length === 0) return 0
  const within = weeks.findIndex((w) => iso >= w.dateStart && iso <= w.dateEnd)
  if (within >= 0) return within
  if (iso < weeks[0].dateStart) return 0 // plan pas encore commencé
  return weeks.length - 1 // plan terminé
}

/** Nombre de jours (arrondi) entre aujourd'hui et la course. Négatif = passé. */
export function daysUntil(iso: string, from = todayISO()): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(iso + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** Petit résumé "J-89" / "Aujourd'hui" / "J+2". */
export function countdownLabel(iso: string, from = todayISO()): string {
  const d = daysUntil(iso, from)
  if (d === 0) return "Aujourd'hui"
  return d > 0 ? `J-${d}` : `J+${-d}`
}

/** Date lisible courte, ex. "14 juil." */
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/** Plage de dates d'une semaine, ex. "14 – 20 juil." */
export function weekRange(w: Week): string {
  const [, m1] = w.dateStart.split('-').map(Number)
  const [, m2, d2] = w.dateEnd.split('-').map(Number)
  const d1 = Number(w.dateStart.split('-')[2])
  return m1 === m2
    ? `${d1} – ${d2} ${MONTHS[m2 - 1]}`
    : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`
}

/** true si le plan (toutes ses semaines) est terminé. */
export function planFinished(program: Program, iso = todayISO()): boolean {
  const last = program.weeks[program.weeks.length - 1]
  return !!last && iso > last.dateEnd
}
