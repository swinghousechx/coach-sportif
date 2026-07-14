import type { StravaSetSummary } from '../types'

// Parse la description d'une activité "WeightTraining" postée par Hevy sur Strava.
// Hevy exporte, par exercice, une ligne titre puis une ligne par série
// ("Set 1: 100 kg × 8", ou "Set 1: 12 reps" au poids de corps).
//
// Le format Hevy a un peu bougé selon les versions — ce parseur est tolérant
// (kg/lb, x/×/*, séparateurs variés) mais devra être confirmé sur un vrai export.

const SET_WEIGHTED = /^set\s*\d+\s*[:.)-]?\s*([\d.]+)\s*(kg|lbs?|lb)?\s*[x×*]\s*(\d+)/i
const SET_BODYWEIGHT = /^set\s*\d+\s*[:.)-]?\s*(\d+)\s*reps?\b/i

interface RawSet {
  weight?: number
  unit?: string
  reps: number
}

export function parseHevyDescription(description: string): StravaSetSummary[] {
  if (!description) return []
  const lines = description.split(/\r?\n/).map((l) => l.trim())

  const items: { name: string; sets: RawSet[] }[] = []
  let current: { name: string; sets: RawSet[] } | null = null

  for (const line of lines) {
    if (!line) continue

    const w = line.match(SET_WEIGHTED)
    if (w) {
      current?.sets.push({ weight: parseFloat(w[1]), unit: (w[2] || 'kg').toLowerCase(), reps: parseInt(w[3], 10) })
      continue
    }
    const b = line.match(SET_BODYWEIGHT)
    if (b) {
      current?.sets.push({ reps: parseInt(b[1], 10) })
      continue
    }

    // Sinon : ligne de titre d'exercice (ou titre de séance — filtré s'il n'a aucune série).
    const name = line.replace(/[\s*_~•-]+$/, '').replace(/^[\s*_~•-]+/, '').trim()
    if (!/[a-zà-ÿ]/i.test(name)) continue // ignore lignes purement emoji/déco
    current = { name, sets: [] }
    items.push(current)
  }

  return items
    .filter((it) => it.sets.length > 0)
    .map((it) => {
      const weights = it.sets.map((s) => s.weight).filter((w): w is number => w != null)
      const unit = it.sets.find((s) => s.unit)?.unit ?? 'kg'
      return {
        name: it.name,
        sets: it.sets.length,
        topWeight: weights.length ? `${Math.max(...weights)} ${unit}` : undefined,
        reps: it.sets.map((s) => s.reps).join(', ')
      }
    })
}
