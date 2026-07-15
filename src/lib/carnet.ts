// Carnet de bord du coach — sa mémoire longue.
//
// Sans lui, chaque débrief est une lecture à froid et chaque conversation repart de
// zéro : l'app savait tout de la séance d'hier et rien de l'athlète. Le carnet garde
// le peu qui doit survivre — une douleur en cours, un schéma répété, une décision
// prise — et repart dans CHAQUE appel. C'est ce qui fait la différence entre un
// rapport et un suivi.
//
// Le coach l'écrit lui-même (outil « noter_au_carnet »), l'athlète le lit et peut
// effacer : sa mémoire reste sous son contrôle, jamais une boîte noire.

export type CarnetType = 'douleur' | 'schema' | 'decision' | 'objectif'

export interface CarnetEntry {
  id: string
  date: string // jour où le coach l'a noté
  type: CarnetType
  text: string
  status: 'ouvert' | 'clos'
  closedAt?: string
}

/** Ce que le coach renvoie : des notes à ajouter, des entrées à clore. */
export interface CarnetOps {
  notes?: { type: CarnetType; text: string }[]
  clore?: string[]
}

const KEY = 'coach:carnet'
const MAX = 40

export function loadCarnet(): CarnetEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveCarnet(entries: CarnetEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)))
  } catch {
    /* ignore quota */
  }
}

export function removeCarnetEntry(id: string): CarnetEntry[] {
  const next = loadCarnet().filter((e) => e.id !== id)
  saveCarnet(next)
  return next
}

/** Applique les notes du coach. Retourne le carnet à jour. */
export function applyCarnetOps(ops: CarnetOps | undefined, today: string): CarnetEntry[] {
  const current = loadCarnet()
  if (!ops || (!ops.notes?.length && !ops.clore?.length)) return current

  const closed = new Set(ops.clore ?? [])
  let next = current.map((e) =>
    closed.has(e.id) && e.status === 'ouvert' ? { ...e, status: 'clos' as const, closedAt: today } : e
  )

  for (const n of ops.notes ?? []) {
    const text = (n.text || '').trim()
    if (!text) continue
    // Pas de doublon : le coach re-note souvent la même chose d'un jour à l'autre.
    if (next.some((e) => e.status === 'ouvert' && e.text.toLowerCase() === text.toLowerCase())) continue
    next.push({ id: newId(next), date: today, type: n.type, text, status: 'ouvert' })
  }

  saveCarnet(next)
  return next
}

function newId(entries: CarnetEntry[]): string {
  const max = entries.reduce((m, e) => Math.max(m, Number(e.id.slice(1)) || 0), 0)
  return `c${max + 1}`
}

/**
 * Le carnet tel qu'il part au coach : les entrées ouvertes, plus les dernières
 * closes (savoir qu'une douleur est résolue vaut mieux que l'avoir oubliée).
 */
export function carnetContext(entries: CarnetEntry[] = loadCarnet()) {
  const ouvertes = entries.filter((e) => e.status === 'ouvert').slice(-14)
  const closes = entries.filter((e) => e.status === 'clos').slice(-4)
  if (!ouvertes.length && !closes.length) return undefined
  return {
    ouvertes: ouvertes.map((e) => ({ id: e.id, depuis: e.date, type: e.type, note: e.text })),
    recemmentCloses: closes.map((e) => ({ type: e.type, note: e.text, closeLe: e.closedAt }))
  }
}
