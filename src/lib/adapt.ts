import type { Adaptation, Day, DayType, Nutrition, Program } from '../types'

// Adaptations du plan décidées avec le coach.
//
// Le plan de référence (program.json) reste INTACT : il est statique, regénéré par
// scripts/gen-plan.mjs et réécrit à chaque déploiement. Les adaptations sont donc une
// couche locale, appliquée par-dessus, indexée par date — même principe que les coches.
// Réversible : on peut toujours rétablir la séance d'origine.

export type { Adaptation }

const KEY = 'coach:adaptations'

export function loadAdaptations(): Record<string, Adaptation> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all && typeof all === 'object' ? all : {}
  } catch {
    return {}
  }
}

export function saveAdaptations(all: Record<string, Adaptation>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}

/** Applique la couche d'adaptations au plan (sans muter l'original). */
export function applyAdaptations(
  program: Program,
  adaptations: Record<string, Adaptation>
): Program {
  if (!Object.keys(adaptations).length) return program

  return {
    ...program,
    weeks: program.weeks.map((w) => ({
      ...w,
      days: w.days.map((d) => {
        const a = adaptations[d.date]
        if (!a) return d

        // Les exercices ne survivent que si la journée reste une journée de salle.
        const staysGym = a.type === 'gym' || a.type === 'gym_and_run'
        return {
          ...d,
          type: a.type,
          sessionName: a.titre,
          description: a.description,
          distanceKm: a.distanceKm ?? (isRunish(a.type) ? d.distanceKm : undefined),
          elevationM: a.elevationM ?? (isRunish(a.type) ? d.elevationM : undefined),
          exercises: staysGym ? d.exercises : undefined,
          run: a.type === 'gym_and_run' ? d.run : undefined,
          nutrition: adaptNutrition(d, a),
          adapted: a
        }
      })
    }))
  }
}

function isRunish(t: DayType): boolean {
  return t === 'run' || t === 'long_run' || t === 'hike' || t === 'race'
}

/**
 * La nutrition doit suivre la séance : garder « protéines dans les 2h post-séance »
 * sur une journée devenue repos serait une consigne fausse.
 * Le coach ajuste l'apport quand la charge bouge ; à défaut, on laisse tomber la note
 * d'origine plutôt que d'inventer des chiffres.
 */
function adaptNutrition(day: Day, a: Adaptation): Nutrition | undefined {
  if (!day.nutrition) return undefined
  if (a.calories == null && !a.noteNutrition) {
    return a.type === day.type ? day.nutrition : { ...day.nutrition, note: undefined }
  }
  return {
    ...day.nutrition,
    calories: a.calories ?? day.nutrition.calories,
    note: a.noteNutrition ?? day.nutrition.note
  }
}
