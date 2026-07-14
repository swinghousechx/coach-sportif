import type { Day, Week } from '../types'
import type { IconName } from './dayMeta'

// Moteur de reco : synthétise l'intelligence du plan en un briefing actionnable
// pour la séance du jour. 100% déterministe (règles), hors-ligne.

export interface RecoSection {
  icon: IconName | 'flame' | 'alert' | 'heart' | 'trending-up'
  title: string
  items: string[]
}
export interface Reco {
  headline: string
  subtitle?: string
  sections: RecoSection[]
}

const EASY = 'easy strict > 5:01/km (allure conversation)'

function isLegDay(day: Day): boolean {
  return day.type === 'gym' && /lower|full body/i.test(day.sessionName ?? '')
}

export function buildReco(day: Day, week: Week, tomorrow?: Day, isToday = true): Reco {
  const sections: RecoSection[] = []
  const phase = day.phase ?? week.muscuLegsPhase ?? ''
  const prog = /progress/i.test(phase)

  const headline = isToday ? 'Ta séance du jour' : 'Ta prochaine séance'
  const subtitle = `${day.label} · ${day.sessionName ?? day.description ?? ''} — semaine ${week.weekNumber} (${week.phase})`

  // --- Objectif / exécution ---
  const focus: string[] = []
  if (day.type === 'gym' || day.type === 'gym_and_run') {
    const name = day.sessionName ?? ''
    if (/lower/i.test(name)) {
      focus.push(
        prog
          ? 'Squat : +2,5 kg vs dernière séance si RPE ≤8. Tu montes tant que ça reste propre.'
          : 'Jambes en maintenance : charge figée au dernier poids maîtrisé, RPE ≤6-7. Objectif entretenir, pas cramer les jambes avant les longues.'
      )
    } else if (/full body/i.test(name)) {
      focus.push(
        prog
          ? 'Deadlift prioritaire : +5 kg si RPE ≤7. Warm-up sérieux avant les séries lourdes.'
          : 'Deadlift en maintenance : charge figée, RPE ≤6. On garde le mouvement, on lève le pied sur la charge.'
      )
    } else if (/upper/i.test(name)) {
      focus.push('Haut du corps : progression maintenue toute la durée du plan. +2,5 kg si RPE ≤8.')
    }
    if (day.type === 'gym_and_run' && day.run) {
      if (/côte|cote/i.test(day.run.type ?? '')) {
        focus.push('Course qualité — côtes : répétitions courtes en montée, marche de récup. Puissance, pas vitesse.')
      } else if (/tempo/i.test(day.run.type ?? '')) {
        focus.push('Course qualité — tempo : bloc Z3 à 4:30-5:01/km sur terrain roulant.')
      } else {
        focus.push(`Course : ${day.run.description ?? 'footing facile'}.`)
      }
    }
  } else if (day.type === 'long_run') {
    focus.push(
      `Sortie longue ${day.distanceKm} km${day.elevationM ? `, ${day.elevationM} m D+` : ''}. Z1-Z2 strict, ${EASY}.`
    )
    focus.push('Power hike dès que ça dépasse 8% — garde la FC < 150 bpm. Relâché en descente. Objectif : finir sans dette de forme.')
  } else if (day.type === 'run') {
    focus.push(`Course facile ${day.distanceKm ?? ''}. ${EASY[0].toUpperCase() + EASY.slice(1)}.`)
    focus.push('Si l\'easy pique, c\'est trop rapide — ralentis. Cette allure construit ton foncier.')
  } else if (day.type === 'hike') {
    focus.push(`Rando / balade easy${day.distanceKm ? ` ${day.distanceKm} km` : ''}. Récup active, rien de dur.`)
  } else if (day.type === 'rest_or_easy') {
    focus.push('Récup : footing très facile (Z1) OU repos complet. Les adaptations se font au repos — ne le grille pas.')
  } else if (day.type === 'race') {
    focus.push('Jour J. Power hike sur les montées (FC < 150), relâché à ~5:15-5:30/km sur plat/descente.')
    focus.push('Gels toutes les 40-45 min + électrolytes. Négocie les 30 premiers km, garde du jus pour la fin.')
  }
  if (focus.length) {
    sections.push({ icon: day.type === 'race' ? 'flag' : prog ? 'trending-up' : 'dumbbell', title: 'À exécuter', items: focus })
  }

  // --- Nutrition ---
  if (day.nutrition) {
    const n = day.nutrition
    const line = [
      n.calories != null ? `${n.calories} kcal` : null,
      n.proteinG != null ? `≥${n.proteinG} g protéines` : null
    ]
      .filter(Boolean)
      .join(' · ')
    const items: string[] = []
    if (line) items.push(line)
    if (n.note) items.push(n.note)
    if (tomorrow?.type === 'long_run') {
      items.push(`Demain = sortie longue ${tomorrow.distanceKm} km → recharge glucides ce soir, hydrate, dors bien.`)
    }
    if (items.length) sections.push({ icon: 'flame', title: 'Nutrition', items })
  }

  // --- Vigilance (points du plan, contextualisés) ---
  const watch: string[] = []
  if (isLegDay(day) && (tomorrow?.type === 'long_run' || tomorrow?.type === 'run')) {
    watch.push('Jambes sollicitées aujourd\'hui + course demain : espace bien, pas de qualité sur jambes cuites.')
  }
  if (day.type === 'long_run') {
    watch.push('FC en montée : power hike si ça dépasse 150 bpm.')
    watch.push('Douleur articulaire (genou/cheville) → ralentis la progression du long run avant d\'ajouter du volume.')
  }
  if (day.type === 'gym_and_run') {
    watch.push('Double sollicitation muscu + course : échauffe bien avant les côtes, fractionne l\'apport sur la journée.')
  }
  if (day.type === 'race') {
    watch.push('Rien de neuf le jour J : matériel, chaussures et nutrition déjà testés à l\'entraînement.')
  }
  if (watch.length) sections.push({ icon: 'alert', title: 'Vigilance', items: watch })

  // --- Prévu vs réalisé (si activité Strava synchronisée) ---
  if (day.strava) {
    const s = day.strava
    const items: string[] = []
    if (s.sportType === 'run') {
      if (s.distanceKm != null) items.push(`Distance réelle : ${s.distanceKm} km${day.distanceKm ? ` (prévu ${day.distanceKm})` : ''}.`)
      if (s.avgHr) items.push(`FC moyenne ${s.avgHr} bpm — ${s.avgHr > 150 ? 'au-dessus de la cible, lève le pied en Z2.' : 'dans la cible, bien.'}`)
      if (s.avgPace) items.push(`Allure moyenne ${s.avgPace}/km.`)
    } else {
      const ex = s.exercises ?? []
      items.push(ex.length ? `${ex.length} exercices enregistrés vs planifié.` : 'Séance muscu enregistrée sur Strava.')
      const top = ex.find((e) => e.topWeight)
      if (top) items.push(`Charge max notée : ${top.name} ${top.topWeight}.`)
    }
    if (items.length) sections.push({ icon: 'heart', title: 'Réalisé (Strava)', items })
  }

  return { headline, subtitle, sections }
}
