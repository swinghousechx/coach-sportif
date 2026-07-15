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
  kind?: 'muscu' | 'course'
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
  activities?: DebriefActivity[]
  activity?: DebriefActivity | null // ancienne forme (rétro-compat cache)
  cached?: boolean
}

/** Normalise vers un tableau (gère l'ancienne forme `activity`). */
export function debriefActivities(r: DebriefResult): DebriefActivity[] {
  if (r.activities) return r.activities.filter(Boolean)
  return r.activity ? [r.activity] : []
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
        week: { weekNumber: week.weekNumber, phase: week.phase, muscuLegsPhase: week.muscuLegsPhase },
        etatDuJour: loadEtat(day.date) ?? undefined
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  return r.json()
}

// ---- Chat avec le coach ----

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  date: string // ISO du jour où le message a été écrit (contexte temporel)
}

const CHAT_KEY = 'coach:chat'
const CHAT_KEEP = 40 // messages conservés en local
const CHAT_SEND = 12 // messages envoyés au coach (borne le coût + le contexte)

export function loadChat(): ChatMessage[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveChat(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-CHAT_KEEP)))
  } catch {
    /* ignore quota */
  }
}

export function clearChat(): void {
  try {
    localStorage.removeItem(CHAT_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Envoie la conversation au coach avec le contexte du jour.
 * Les messages d'un autre jour sont préfixés par leur date pour que le coach
 * situe ce qui a été dit (« hier j'avais mal au genou »).
 */
export async function chatCoach(
  messages: ChatMessage[],
  ctx: { day: Day; week: Week; program: Program; tomorrow?: Day; today: string }
): Promise<string> {
  if (!API) throw new Error('coach non configuré')

  const payload = messages.slice(-CHAT_SEND).map((m) => ({
    role: m.role,
    content: m.date === ctx.today ? m.content : `[${frDate(m.date)}] ${m.content}`
  }))

  const r = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(SECRET ? { 'x-app-secret': SECRET } : {}) },
    body: JSON.stringify({
      messages: payload,
      context: {
        aujourdhui: ctx.today,
        raceDate: ctx.program.raceDate,
        raceInfo: ctx.program.raceInfo,
        semaine: {
          numero: ctx.week.weekNumber,
          phase: ctx.week.phase,
          muscuLegsPhase: ctx.week.muscuLegsPhase
        },
        seanceDuJour: ctx.day,
        seanceDeDemain: ctx.tomorrow,
        etatDuJour: loadEtat(ctx.today) ?? undefined
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  return (await r.json()).reply as string
}

function frDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ---- État du jour (récup subjective + FC repos), par date ----

export interface DailyState {
  sommeil?: 'bien' | 'moyen' | 'mauvais'
  fatigue?: number // 1 (frais) → 5 (cuit)
  hrRest?: number // FC repos (bpm), depuis la Garmin
}

const ETAT_KEY = 'coach:etat'

export function loadEtat(date: string): DailyState | null {
  try {
    const all = JSON.parse(localStorage.getItem(ETAT_KEY) || '{}')
    return all[date] ?? null
  } catch {
    return null
  }
}

export function saveEtat(date: string, etat: DailyState): void {
  try {
    const all = JSON.parse(localStorage.getItem(ETAT_KEY) || '{}')
    all[date] = etat
    localStorage.setItem(ETAT_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
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
