import type { Day, Program } from '../types'

// Zones FC et cibles par sortie, calculées à partir des VRAIES données.
//
// Le plan de départ fixe ses repères FC « par âge (indicatives) » et demande une
// recalibration dès que possible. Ici : FC max observée sur le terrain (Strava) +
// FC repos saisie dans « état du jour » → zones de Karvonen (réserve cardiaque),
// nettement plus juste qu'un 220-âge.
//
// Règle : on n'affiche jamais un chiffre qu'on n'a pas les moyens de calculer.
// Sans FC max mesurée, pas de zones — on le dit, on n'invente pas.

/** Mesures brutes renvoyées par le backend (aucune extrapolation). */
export interface Profil {
  since: string
  runs: number
  runsAvecFc: number
  hrMax: number | null
  hrTop: number[]
  easyPaceSec: number | null // allure médiane des sorties, en s/km
  easyHrMedian: number | null
  weeklyKm: number | null
  longestKm: number | null
  longestElevM: number | null
  cached?: boolean
}

export interface Zone {
  key: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5'
  label: string
  lo: number
  hi: number
}

/** % de réserve cardiaque (Karvonen). Bornes classiques en endurance. */
const HRR_BANDS: { key: Zone['key']; label: string; lo: number; hi: number }[] = [
  { key: 'Z1', label: 'Récup', lo: 0.5, hi: 0.6 },
  { key: 'Z2', label: 'Endurance', lo: 0.6, hi: 0.7 },
  { key: 'Z3', label: 'Tempo', lo: 0.7, hi: 0.8 },
  { key: 'Z4', label: 'Seuil', lo: 0.8, hi: 0.9 },
  { key: 'Z5', label: 'VMA', lo: 0.9, hi: 1 }
]

/** % de FC max — repli quand la FC repos n'a jamais été saisie (moins précis, mais honnête). */
const PCT_MAX_BANDS: { key: Zone['key']; label: string; lo: number; hi: number }[] = [
  { key: 'Z1', label: 'Récup', lo: 0.6, hi: 0.68 },
  { key: 'Z2', label: 'Endurance', lo: 0.68, hi: 0.78 },
  { key: 'Z3', label: 'Tempo', lo: 0.78, hi: 0.87 },
  { key: 'Z4', label: 'Seuil', lo: 0.87, hi: 0.93 },
  { key: 'Z5', label: 'VMA', lo: 0.93, hi: 1 }
]

export type ZoneMethod = 'karvonen' | 'pct-max'

export interface ZoneSet {
  zones: Zone[]
  method: ZoneMethod
  hrMax: number
  hrRest?: number
}

/** Zones FC. Karvonen si la FC repos est connue, sinon % de FC max. */
export function computeZones(hrMax: number, hrRest?: number): ZoneSet {
  if (hrRest && hrRest > 25 && hrRest < hrMax - 40) {
    const hrr = hrMax - hrRest
    return {
      method: 'karvonen',
      hrMax,
      hrRest,
      zones: HRR_BANDS.map((b) => ({
        key: b.key,
        label: b.label,
        lo: Math.round(hrRest + b.lo * hrr),
        hi: Math.round(hrRest + b.hi * hrr)
      }))
    }
  }
  return {
    method: 'pct-max',
    hrMax,
    zones: PCT_MAX_BANDS.map((b) => ({
      key: b.key,
      label: b.label,
      lo: Math.round(b.lo * hrMax),
      hi: Math.round(b.hi * hrMax)
    }))
  }
}

export function zone(set: ZoneSet, key: Zone['key']): Zone {
  return set.zones.find((z) => z.key === key)!
}

// ---- Cibles par sortie ----

export interface Target {
  icon: 'activity' | 'heart' | 'mountain' | 'flame' | 'route'
  label: string
  value: string
  hint?: string
}

/** Allure plancher du plan : l'easy ne descend jamais sous 5:01/km. */
const EASY_FLOOR_SEC = 301
const HIKE_HR_CEILING = 150 // power hike en montée

export function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Cibles chiffrées d'une sortie : allure, FC, D+, effort.
 * Tout est dérivé du plan + du profil réel. Rien d'inventé : si une donnée manque,
 * la cible correspondante n'apparaît pas.
 */
export function targetsFor(
  day: Day,
  program: Program,
  profil: Profil | null,
  zones: ZoneSet | null
): Target[] {
  const t: Target[] = []
  const isRace = day.type === 'race'
  const isLong = day.type === 'long_run'
  const isEasyRun = day.type === 'run' || day.type === 'hike'
  const climbs = (day.elevationM ?? 0) >= 150 || isRace || isLong

  if (!isRace && !isLong && !isEasyRun && day.type !== 'gym_and_run') return t

  // --- Allure ---
  if (isRace) {
    t.push({
      icon: 'activity',
      label: 'Allure plat / descente',
      value: '5:15–5:30 /km',
      hint: `Sub-4h sur ${program.raceInfo.distanceKm} km ≈ 5:41/km de moyenne, D+ compris.`
    })
  } else if (day.type === 'gym_and_run' && day.run) {
    t.push({ icon: 'activity', label: 'Allure tempo', value: '4:30–5:01 /km', hint: 'Bloc Z3, terrain roulant.' })
  } else {
    const easy = profil?.easyPaceSec
    t.push({
      icon: 'activity',
      label: 'Allure easy',
      value: `> ${fmtPace(EASY_FLOOR_SEC)} /km`,
      hint: easy
        ? `Ton easy médian sur ${profil!.runs} sorties : ${fmtPace(easy)}/km.`
        : 'Allure conversation : tu dois pouvoir parler en phrases entières.'
    })
  }

  // --- FC ---
  if (zones) {
    if (isRace) {
      t.push({
        icon: 'heart',
        label: 'FC plafond',
        value: `< ${HIKE_HR_CEILING} bpm en montée`,
        hint: `Z2 ${zone(zones, 'Z2').lo}–${zone(zones, 'Z2').hi} sur le plat. Au-dessus, tu paies au 30e km.`
      })
    } else if (day.type === 'gym_and_run' && day.run) {
      const z3 = zone(zones, 'Z3')
      t.push({ icon: 'heart', label: 'FC cible', value: `${z3.lo}–${z3.hi} bpm`, hint: 'Z3 tempo.' })
    } else {
      const z2 = zone(zones, 'Z2')
      const drift = profil?.easyHrMedian
      t.push({
        icon: 'heart',
        label: 'FC cible',
        value: `${zone(zones, 'Z1').lo}–${z2.hi} bpm`,
        hint:
          drift != null && drift > z2.hi
            ? `Attention : ton easy tourne à ${drift} bpm de moyenne, au-dessus de ta Z2. Tu cours tes easy trop vite.`
            : drift != null
              ? `Ton easy tourne à ${drift} bpm de moyenne — dans la cible.`
              : `Z1–Z2 (${zones.method === 'karvonen' ? 'réserve cardiaque' : '% FC max'}).`
      })
    }
  }

  // --- Dénivelé ---
  if (climbs) {
    t.push({
      icon: 'mountain',
      label: 'Montées',
      value: `Power hike > 8 %`,
      hint: `Marche dès que la FC dépasse ${HIKE_HR_CEILING} bpm. Relâché en descente.`
    })
  }

  // --- Effort perçu ---
  t.push({
    icon: 'flame',
    label: 'Effort perçu',
    value: isRace ? 'RPE 6–7' : isLong ? 'RPE 4–5' : day.type === 'gym_and_run' ? 'RPE 6' : 'RPE 3–4',
    hint: isEasyRun ? 'Si ça pique, c’est trop rapide.' : undefined
  })

  return t
}

// ---- FC repos, depuis « état du jour » ----

/** Médiane des FC repos saisies (plus robuste qu'une seule mesure du matin). */
export function medianHrRest(): number | undefined {
  try {
    const all = JSON.parse(localStorage.getItem('coach:etat') || '{}') as Record<
      string,
      { hrRest?: number }
    >
    const xs = Object.values(all)
      .map((e) => e?.hrRest)
      .filter((v): v is number => typeof v === 'number' && v > 25 && v < 120)
      .sort((a, b) => a - b)
    if (!xs.length) return undefined
    const m = Math.floor(xs.length / 2)
    return Math.round(xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2)
  } catch {
    return undefined
  }
}
