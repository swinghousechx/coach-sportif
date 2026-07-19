import type { Program } from '../types'
import { effectiveHrMax } from './coach'
import { computeZones, medianHrRest, type Profil } from './zones'

// « Suis-je dans les clous pour le sub-4h ? »
//
// Volontairement PAS un chrono prédit. Projeter un temps de course depuis des sorties
// d'entraînement, c'est de la fausse précision : trop de variables (météo, terrain,
// nutrition, jour J) pour un chiffre qui aurait l'air d'une promesse. L'app refuse
// d'inventer une zone FC ; elle ne va pas inventer un chrono.
//
// À la place : quatre faits mesurés, confrontés aux exigences du plan et de la course.
// L'athlète en tire sa propre conclusion — c'est plus honnête, et plus utile.

export type Verdict = 'ok' | 'en-chemin' | 'attention' | 'inconnu'

export interface Axis {
  key: 'longue' | 'denivele' | 'volume' | 'easy'
  label: string
  value: string
  target: string
  verdict: Verdict
  note: string
}

export function readiness(program: Program, profil: Profil | null, today: string): Axis[] {
  const hrRest = medianHrRest()
  const hrMax = effectiveHrMax(profil)
  const zones = hrMax ? computeZones(hrMax, hrRest) : null

  const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v)))
  const raceKm = program.raceInfo.distanceKm
  const raceD = program.raceInfo.elevationM

  // La bonne question n'est pas « es-tu au pic ? » — en semaine 1 sur 13, évidemment
  // que non, le plan est fait pour t'y amener. C'est « es-tu à jour de ce que le plan
  // t'a demandé JUSQU'ICI ? ». On mesure donc contre les semaines déjà entamées.
  const passees = program.weeks.filter((w) => w.dateStart <= today)
  const demandeKm = Math.max(...passees.map((w) => num(w.longRunKm)).filter(Number.isFinite), 0)
  const demandeD = Math.max(
    ...passees
      .flatMap((w) => w.days)
      .filter((d) => d.type === 'long_run' || d.type === 'race')
      .map((d) => d.elevationM ?? 0),
    0
  )
  const picKm = Math.max(...program.weeks.map((w) => num(w.longRunKm)).filter(Number.isFinite), 0)

  const axes: Axis[] = []

  // 1. Plus longue sortie — le meilleur prédicteur de la fin de course.
  if (profil?.longestKm != null && demandeKm > 0) {
    const r = profil.longestKm / demandeKm
    const reste = Math.max(0, Math.round(picKm - profil.longestKm))
    axes.push({
      key: 'longue',
      label: 'Plus longue sortie',
      value: `${profil.longestKm} km`,
      target: `${demandeKm} km demandés à ce stade`,
      verdict: r >= 0.95 ? 'ok' : r >= 0.75 ? 'en-chemin' : 'attention',
      note:
        r >= 0.95
          ? `À jour de ce que le plan demande. Il te monte à ${picKm} km d'ici la course${reste ? ` — ${reste} km à construire` : ''}.`
          : `Le plan demandait ${demandeKm} km à ce stade. Rattrape avant de suivre la progression.`
    })
  }

  // 2. Dénivelé encaissé — 900 D+ ne s'improvisent pas le jour J.
  if (profil?.longestElevM != null && demandeD > 0) {
    const r = profil.longestElevM / demandeD
    axes.push({
      key: 'denivele',
      label: 'D+ encaissé',
      value: `${profil.longestElevM} m`,
      target: `${demandeD} m demandés à ce stade`,
      verdict: r >= 0.9 ? 'ok' : r >= 0.7 ? 'en-chemin' : 'attention',
      note:
        r >= 0.9
          ? `Ton corps encaisse ce que le plan demande. Objectif jour J : ${raceD} m — tu es à ${Math.round((profil.longestElevM / raceD) * 100)} %.`
          : `Le plan demandait ${demandeD} m à ce stade. Cherche du dénivelé sur tes longues.`
    })
  }

  // 3. Volume hebdomadaire — face au pic réel du plan, pas à un idéal.
  if (profil?.weeklyKm != null && profil.weeklySeries?.length) {
    const peak = Math.max(...profil.weeklySeries)
    axes.push({
      key: 'volume',
      label: 'Volume hebdo',
      value: `${profil.weeklyKm} km/sem`,
      target: `pic récent ${peak} km`,
      verdict: 'inconnu',
      note: `Moyenne des 4 dernières semaines. La progression compte plus que le chiffre : ~10 % par semaine, pas plus.`
    })
  }

  // 4. Discipline easy — le pilier du plan, et le seul axe où il est en échec.
  if (zones && profil?.easyHrMedian != null) {
    const z2 = zones.zones.find((z) => z.key === 'Z2')!
    const over = profil.easyHrMedian > z2.hi
    axes.push({
      key: 'easy',
      label: 'Discipline easy',
      value: `${profil.easyHrMedian} bpm`,
      target: `Z2 ≤ ${z2.hi} bpm`,
      verdict: over ? 'attention' : 'ok',
      note: over
        ? `Tes easy tournent au-dessus de ta Z2. C'est ce qui coûte le plus cher sur ${raceKm} km.`
        : 'Tes easy sont dans la zone. C’est ce qui construit le foncier.'
    })
  }

  return axes
}
