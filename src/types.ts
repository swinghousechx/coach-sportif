// Modèle du plan marathon trail : une entrée par semaine, chaque jour muscu OU course.

export type DayType =
  | 'gym'
  | 'run'
  | 'long_run'
  | 'hike'
  | 'rest_or_easy'
  | 'gym_and_run'
  | 'race'

export interface Exercise {
  name: string
  sets: number | string
  reps: number | string
  note?: string
}

/** Bloc course intégré à une journée muscu+course (jeudi). */
export interface RunDetail {
  distanceKm?: number | string
  type?: string
  description?: string
  zone?: string
  elevationM?: number
}

export interface Nutrition {
  calories: number | null
  proteinG: number | null
  note?: string
}

/** Un exercice réalisé, extrait de la description Hevy d'une activité muscu Strava. */
export interface StravaSetSummary {
  name: string
  sets?: number
  topWeight?: string // ex. "100 kg"
  reps?: string // ex. "8, 8, 6"
}

/**
 * Résumé d'une activité Strava (rempli par un futur sync backend).
 * Couvre course (Run/TrailRun) ET muscu (WeightTraining via Hevy).
 */
export interface StravaSummary {
  activityId: number
  sportType: 'run' | 'weight'
  // course
  distanceKm?: number
  elevationM?: number
  movingTime?: string
  avgHr?: number
  avgPace?: string
  // muscu : soit exercices déjà parsés, soit la description Hevy brute (parsée à l'affichage)
  exercises?: StravaSetSummary[]
  description?: string
}

/**
 * Une adaptation d'une journée, décidée avec le coach et validée par l'athlète.
 * Vit en local (localStorage), par-dessus le plan de référence — voir lib/adapt.ts.
 */
export interface Adaptation {
  date: string // "YYYY-MM-DD"
  type: DayType
  titre: string
  description: string
  distanceKm?: number
  elevationM?: number
  /** Apport ajusté quand la charge du jour change (sinon la nutrition d'origine deviendrait fausse). */
  calories?: number
  noteNutrition?: string
  raison: string
  appliedAt: string // ISO
}

export interface Day {
  date: string // "YYYY-MM-DD"
  label: string // "Lundi" …
  type: DayType
  /** Présent si la journée a été adaptée avec le coach (posé à l'affichage). */
  adapted?: Adaptation
  status?: string // "done" pré-coché depuis le JSON
  sessionName?: string
  description?: string
  phase?: string // phase muscu du jour (progression / maintenance / taper)
  exercises?: Exercise[]
  run?: RunDetail // pour type gym_and_run
  distanceKm?: number | string
  zone?: string
  elevationM?: number
  goalTime?: string // jour de course
  nutrition?: Nutrition
  strava?: StravaSummary // activité principale du jour (muscu ou course)
  runStrava?: StravaSummary // activité course d'une journée muscu + course (jeudi)
}

export interface Week {
  weekNumber: number
  dateStart: string
  dateEnd: string
  phase: string
  longRunKm: number | string | null
  elevationLoad?: string
  muscuLegsPhase?: string
  days: Day[]
}

export interface RaceInfo {
  name: string
  distanceKm: number
  elevationM: number
  goalTime: string
}

export interface Program {
  raceDate: string
  raceInfo: RaceInfo
  updatedAt?: string
  weeks: Week[]
}

/** Familles d'accent : course (orange) vs muscu (lime). */
export function isRunType(type: DayType): boolean {
  return type === 'run' || type === 'long_run' || type === 'hike' || type === 'race'
}
