import type { Adaptation, Day, Program, Week } from '../types'
import { computeZones, fmtPace, medianHrRest, type Profil } from './zones'
import { loadDoneOverrides } from './storage'
import { carnetContext, type CarnetOps } from './carnet'

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
  /** Empreinte de la séance prévue au moment du débrief (voir planFingerprint). */
  planKey?: string
  /** Notes que le coach veut porter à son carnet (absent d'un débrief servi du cache). */
  carnet?: CarnetOps
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

/**
 * Empreinte de la séance PRÉVUE. Elle entre dans la clé de cache du débrief :
 * la date seule ne suffit pas — si le plan du jour change (recalage du calendrier,
 * adaptation décidée avec le coach), le débrief d'avant devient un hors-sujet.
 * Une empreinte différente = un débrief à refaire, pas à ressortir du cache.
 */
export function planFingerprint(day: Day): string {
  const src = JSON.stringify({
    l: day.label,
    t: day.type,
    n: day.sessionName ?? null,
    d: day.description ?? null,
    km: day.distanceKm ?? null,
    dp: day.elevationM ?? null,
    ex: day.exercises?.map((e) => [e.name, e.sets, e.reps]) ?? null,
    r: day.run ? [day.run.description ?? null, day.run.distanceKm ?? null] : null,
    a: day.adapted?.appliedAt ?? null,
    // La FC max entre dans l'empreinte : le débrief juge le temps en zone sur les
    // zones qui en découlent. Changer la FC max doit régénérer le débrief, pas
    // ressortir l'ancien calé sur des zones fausses.
    hrmax: effectiveHrMax(loadProfil())
  })
  let h = 5381 // djb2
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export async function fetchDebrief(
  day: Day,
  week: Week,
  program: Program,
  force = false
): Promise<DebriefResult> {
  if (!API) throw new Error('coach non configuré')
  const planKey = planFingerprint(day)
  const r = await fetch(`${API}/debrief`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(SECRET ? { 'x-app-secret': SECRET } : {}) },
    body: JSON.stringify({
      date: day.date,
      matchType: matchTypeFor(day),
      force,
      planKey,
      planned: day,
      context: {
        raceDate: program.raceDate,
        raceInfo: program.raceInfo,
        week: { weekNumber: week.weekNumber, phase: week.phase, muscuLegsPhase: week.muscuLegsPhase },
        etatDuJour: loadEtat(day.date) ?? undefined,
        // Mêmes zones/allures que celles affichées à l'athlète : un débrief qui juge
        // « FC trop haute » doit le faire sur SES zones, pas sur une intuition.
        profil: profilContext(),
        // Sans la semaine ni l'adhérence, le débrief jugeait une séance hors de tout
        // contexte — le contraire du travail d'un coach.
        semaineEnCours: week.days,
        adherence: adherenceContext(program, day.date),
        carnet: carnetContext()
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  return { ...(await r.json()), planKey }
}

// ---- Briefing du jour (avant la séance) ----

export interface BriefingResult {
  briefing: string
  adaptation?: Adaptation
  carnet?: CarnetOps
  /** Séance prévue + état du jour au moment du brief : si ça bouge, le brief est caduc. */
  key?: string
}

/**
 * Le brief dépend de la séance ET de l'état du jour. Saisir « mal dormi » après coup
 * doit invalider un brief écrit quand tout allait bien — d'où l'état dans la clé.
 */
function briefingKey(day: Day): string {
  const etat = loadEtat(day.date)
  return `${planFingerprint(day)}:${etat ? `${etat.sommeil ?? '-'}${etat.fatigue ?? '-'}${etat.hrRest ?? '-'}` : '-'}`
}

export async function fetchBriefing(
  day: Day,
  week: Week,
  program: Program
): Promise<BriefingResult> {
  if (!API) throw new Error('coach non configuré')
  const key = briefingKey(day)
  const r = await fetch(`${API}/briefing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(SECRET ? { 'x-app-secret': SECRET } : {}) },
    body: JSON.stringify({
      planned: day,
      context: {
        aujourdhui: day.date,
        raceDate: program.raceDate,
        raceInfo: program.raceInfo,
        semaine: {
          numero: week.weekNumber,
          phase: week.phase,
          muscuLegsPhase: week.muscuLegsPhase
        },
        semaineEnCours: week.days,
        etatDuJour: loadEtat(day.date) ?? undefined,
        profil: profilContext(),
        adherence: adherenceContext(program, day.date),
        carnet: carnetContext()
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  return { ...(await r.json()), key }
}

const BRIEFING_KEY = 'coach:briefings'

export function loadBriefing(day: Day): BriefingResult | null {
  try {
    const all = JSON.parse(localStorage.getItem(BRIEFING_KEY) || '{}')
    const hit = all[day.date]
    return hit && hit.key === briefingKey(day) ? hit : null
  } catch {
    return null
  }
}

export function saveBriefing(date: string, r: BriefingResult): void {
  try {
    // Un seul brief conservé : celui du jour. Les anciens n'ont aucune valeur.
    localStorage.setItem(BRIEFING_KEY, JSON.stringify({ [date]: r }))
  } catch {
    /* ignore quota */
  }
}

// ---- Profil physiologique (mesuré sur Strava) ----

const PROFIL_KEY = 'coach:profil'

export function loadProfil(): Profil | null {
  try {
    return JSON.parse(localStorage.getItem(PROFIL_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveProfil(p: Profil): void {
  try {
    localStorage.setItem(PROFIL_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

// FC max saisie à la main. L'app ne mesure que ce qu'elle voit : si l'athlète ne
// s'est jamais mis dans le rouge, la « FC max observée » est en fait le plafond de
// ses easy — trop basse, et TOUTES les zones en découlent. L'override reprend la main.
const HRMAX_KEY = 'coach:hrmax'

export function loadHrMaxOverride(): number | null {
  try {
    const v = Number(localStorage.getItem(HRMAX_KEY))
    return v > 120 && v < 230 ? v : null
  } catch {
    return null
  }
}

export function saveHrMaxOverride(v: number | null): void {
  try {
    if (v == null) localStorage.removeItem(HRMAX_KEY)
    else localStorage.setItem(HRMAX_KEY, String(v))
  } catch {
    /* ignore */
  }
}

/** FC max à utiliser pour les zones : la saisie manuelle prime sur la mesure. */
export function effectiveHrMax(p: Profil | null): number | null {
  return loadHrMaxOverride() ?? p?.hrMax ?? null
}

/**
 * Profil + zones tels qu'affichés dans l'app, pour que le coach raisonne sur les
 * mêmes chiffres que l'athlète (et ne réinvente pas ses zones à chaque réponse).
 */
export function profilContext() {
  const p = loadProfil()
  if (!p) return undefined
  const hrRest = medianHrRest()
  const hrMax = effectiveHrMax(p)
  const zones = hrMax ? computeZones(hrMax, hrRest) : null
  return {
    mesureSur: `${p.runs} sorties depuis le ${p.since}`,
    hrMax,
    hrMaxSource: loadHrMaxOverride() != null ? 'saisie manuelle' : 'observée sur Strava',
    hrRest,
    easyPace: p.easyPaceSec ? `${fmtPace(p.easyPaceSec)}/km` : undefined,
    easyHrMedian: p.easyHrMedian,
    volumeHebdoKm: p.weeklyKm,
    // La tendance était calculée et affichée, mais jamais transmise : sans elle le
    // coach ne peut pas voir un saut de charge, ce qui est son premier travail.
    volume8SemainesKm: p.weeklySeries,
    plusLongueKm: p.longestKm,
    // La muscu fait la moitié du plan et n'était suivie nulle part dans le temps.
    force: p.force?.length ? p.force : undefined,
    zonesFc: zones
      ? {
          methode: zones.method === 'karvonen' ? 'réserve cardiaque (Karvonen)' : '% FC max',
          ...Object.fromEntries(zones.zones.map((z) => [z.key, `${z.lo}-${z.hi} bpm`]))
        }
      : undefined,
    // Bornes numériques : le worker en a besoin pour découper les streams FC en zones.
    // Les chaînes ci-dessus sont pour le coach, celles-ci pour le calcul.
    zonesBornes: zones?.zones.map((z) => ({ key: z.key, lo: z.lo, hi: z.hi }))
  }
}

/**
 * Ce que l'athlète a réellement fait du plan. Les coches ne quittaient jamais le
 * téléphone : le coach débriefait sans savoir si la séance de la veille avait été
 * sautée. On ne compte que les jours passés — cocher demain n'a pas de sens.
 */
export function adherenceContext(program: Program, today: string) {
  const overrides = loadDoneOverrides()
  const done = (d: Day) => (d.date in overrides ? overrides[d.date] : d.status === 'done')

  const days = program.weeks.flatMap((w) => w.days).filter((d) => d.date < today)
  if (!days.length) return undefined

  const last28 = days.filter((d) => (Date.parse(today) - Date.parse(d.date)) / 86400_000 <= 28)
  const manquees = last28
    .filter((d) => !done(d) && d.type !== 'rest_or_easy')
    .map((d) => `${d.label} ${d.date.slice(8, 10)}/${d.date.slice(5, 7)} — ${d.sessionName ?? d.description ?? d.type}`)

  return {
    depuisLeDebut: `${days.filter(done).length}/${days.length} jours passés cochés`,
    surLes4DernieresSemaines: `${last28.filter(done).length}/${last28.length}`,
    seancesNonCochees: manquees.slice(-6),
    // Une coche est déclarative : elle dit l'intention, Strava dit le réel.
    remarque: 'Coches saisies à la main — recoupe-les avec Strava avant de conclure.'
  }
}

export async function fetchProfil(force = false): Promise<Profil> {
  if (!API) throw new Error('coach non configuré')
  const r = await fetch(`${API}/profil${force ? '?force=1' : ''}`, {
    headers: { ...(SECRET ? { 'x-app-secret': SECRET } : {}) }
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  const p = (await r.json()) as Profil
  saveProfil(p)
  return p
}

// ---- Chat avec le coach ----

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  date: string // ISO du jour où le message a été écrit (contexte temporel)
  /** Modification du plan proposée par le coach avec ce message. */
  adaptation?: Adaptation
  /** Décision de l'athlète sur cette proposition (absent = pas encore tranché). */
  decision?: 'applied' | 'ignored'
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
): Promise<{ reply: string; adaptation?: Adaptation; carnet?: CarnetOps }> {
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
        // La semaine entière : indispensable pour décaler une séance à bon escient.
        semaineEnCours: ctx.week.days,
        etatDuJour: loadEtat(ctx.today) ?? undefined,
        // Le coach doit citer les MÊMES chiffres que ceux affichés sur les séances.
        profil: profilContext(),
        adherence: adherenceContext(ctx.program, ctx.today),
        // Sa mémoire : sans elle il redécouvre l'athlète à chaque message.
        carnet: carnetContext()
      }
    })
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.error || `erreur ${r.status}`)
  }
  const data = await r.json()
  return {
    reply: data.reply as string,
    adaptation: data.adaptation as Adaptation | undefined,
    carnet: data.carnet as CarnetOps | undefined
  }
}

function frDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ---- État du jour (récup subjective + FC repos), par date ----

export interface DailyState {
  sommeil?: 'bien' | 'moyen' | 'mauvais' // ressenti — subjectif, jamais automatisable
  fatigue?: number // 1 (frais) → 5 (cuit), subjectif aussi
  hrRest?: number // FC repos (bpm)
  sleepHours?: number // durée mesurée, distincte du ressenti
  /** 'auto' = poussé depuis Apple Santé par le raccourci ; sinon saisi à la main. */
  hrRestSource?: 'auto'
}

/** FC de repos + sommeil mesurés, poussés par le raccourci iOS (voir worker /etat). */
export async function fetchEtatAuto(
  date: string
): Promise<{ hrRest?: number; sleepHours?: number } | null> {
  if (!API) return null
  try {
    const r = await fetch(`${API}/etat?date=${date}`, {
      headers: { ...(SECRET ? { 'x-app-secret': SECRET } : {}) }
    })
    if (!r.ok) return null
    const d = await r.json()
    return d?.hrRest != null || d?.sleepHours != null ? d : null
  } catch {
    return null
  }
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

/**
 * Débrief en cache pour ce jour, seulement s'il porte sur la séance actuellement prévue.
 * Empreinte absente (débrief d'avant ce correctif) ou différente → on considère qu'il
 * n'y en a pas : mieux vaut reproposer le bouton qu'afficher un débrief hors-sujet.
 */
export function loadDebrief(date: string, planKey: string): DebriefResult | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    const hit = all[date]
    return hit && hit.planKey === planKey ? hit : null
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
