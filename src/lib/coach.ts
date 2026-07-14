import type { Day, Program, Week } from '../types'

// Client du backend "Coach" (Cloudflare Worker). Tout est optionnel :
// si VITE_COACH_API n'est pas défini, la fonctionnalité reste masquée et l'app
// fonctionne exactement comme avant.

const API = (import.meta.env.VITE_COACH_API as string | undefined)?.replace(/\/$/, '')
const SECRET = import.meta.env.VITE_COACH_SECRET as string | undefined

export function isCoachEnabled(): boolean {
  return !!API
}

export function stravaConnectUrl(): string {
  return `${API}/auth`
}

export async function coachStatus(): Promise<boolean> {
  if (!API) return false
  try {
    const r = await fetch(`${API}/status`)
    if (!r.ok) return false
    return (await r.json()).connected === true
  } catch {
    return false
  }
}

export interface DebriefActivity {
  name?: string
  sport_type?: string
  distanceKm?: number | null
  elevationM?: number | null
  movingTime?: string | null
  avgHr?: number | null
  avgPace?: string | null
}

export interface DebriefResult {
  debrief: string
  activity: DebriefActivity | null
  cached?: boolean
}

/** Type d'activité Strava attendu pour ce jour. */
export function matchTypeFor(day: Day): 'weight' | 'run' {
  return day.type === 'gym' || day.type === 'gym_and_run' ? 'weight' : 'run'
}

export async function fetchDebrief(
  day: Day,
  week: Week,
  program: Program,
  force = false
): Promise<DebriefResult> {
  if (!API) throw new Error('coach non configuré')
  const r = await fetch(`${API}/debrief`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(SECRET ? { 'x-app-secret': SECRET } : {}) },
    body: JSON.stringify({
      date: day.date,
      matchType: matchTypeFor(day),
      force,
      planned: day,
      context: {
        raceDate: program.raceDate,
        raceInfo: program.raceInfo,
        week: { weekNumber: week.weekNumber, phase: week.phase, muscuLegsPhase: week.muscuLegsPhase }
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  return r.json()
}

// ---- Persistance locale des débriefs (par date) ----

const KEY = 'coach:debriefs'

export function loadDebrief(date: string): DebriefResult | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all[date] ?? null
  } catch {
    return null
  }
}

export function saveDebrief(date: string, result: DebriefResult): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[date] = result
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}
