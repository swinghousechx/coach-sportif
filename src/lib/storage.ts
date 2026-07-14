import type { Program } from '../types'

const PROGRAM_KEY = 'coach:program'
const DONE_KEY = 'coach:done:v2' // clé par date (yyyy-mm-dd), pas de reset hebdo

// ---- Programme (fichier chargé manuellement, prioritaire sur public/program.json) ----

export function loadStoredProgram(): Program | null {
  try {
    const raw = localStorage.getItem(PROGRAM_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return isValidProgram(data) ? data : null // ignore un ancien format incompatible
  } catch {
    return null
  }
}

export function saveProgram(program: Program): void {
  localStorage.setItem(PROGRAM_KEY, JSON.stringify(program))
}

export function clearStoredProgram(): void {
  localStorage.removeItem(PROGRAM_KEY)
}

/** Valide grossièrement un JSON importé (nouveau modèle : weeks[] avec days[]). */
export function isValidProgram(data: unknown): data is Program {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  if (typeof p.raceDate !== 'string' || !Array.isArray(p.weeks) || p.weeks.length === 0) return false
  const w0 = p.weeks[0] as Record<string, unknown>
  return !!w0 && Array.isArray(w0.days) && w0.days.length > 0
}

// ---- Coches "fait" : overrides utilisateur par date, persistés sans reset ----
// L'état affiché = statut du JSON (day.status === 'done') fusionné avec ces overrides.

export function loadDoneOverrides(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function saveDoneOverrides(overrides: Record<string, boolean>): void {
  localStorage.setItem(DONE_KEY, JSON.stringify(overrides))
}
