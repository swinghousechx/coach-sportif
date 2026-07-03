import type { Program } from '../types'
import { isoWeekKey } from './week'

const PROGRAM_KEY = 'coach:program'
const DONE_KEY = 'coach:done'

// ---- Programme (fichier chargé manuellement, prioritaire sur public/program.json) ----

export function loadStoredProgram(): Program | null {
  try {
    const raw = localStorage.getItem(PROGRAM_KEY)
    return raw ? (JSON.parse(raw) as Program) : null
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

/** Valide grossièrement un JSON importé avant de le considérer comme un programme. */
export function isValidProgram(data: unknown): data is Program {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  return (
    typeof p.blockName === 'string' &&
    typeof p.blockValidUntil === 'string' &&
    Array.isArray(p.days) &&
    p.days.length > 0
  )
}

// ---- Coches "fait" : persistées, mais réinitialisées au changement de semaine ISO ----

type DoneState = {
  week: string
  done: Record<number, boolean>
}

export function loadDone(now = new Date()): Record<number, boolean> {
  const currentWeek = isoWeekKey(now)
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DoneState
    if (parsed.week !== currentWeek) return {} // nouvelle semaine → reset
    return parsed.done ?? {}
  } catch {
    return {}
  }
}

export function saveDone(done: Record<number, boolean>, now = new Date()): void {
  const state: DoneState = { week: isoWeekKey(now), done }
  localStorage.setItem(DONE_KEY, JSON.stringify(state))
}
