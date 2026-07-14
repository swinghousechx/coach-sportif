// Génère public/program.json : le plan marathon trail 42K/900 D+ sur 13 semaines.
// Source de vérité éditable ensuite à la main (ou régénérable via `npm run plan`).
// Les cibles nutrition évoluent par phase — ajustables chaque semaine dans le JSON.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'program.json')
mkdirSync(dirname(OUT), { recursive: true })

const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ---- Vue macro des 13 semaines (tableau section 2 du plan) ----
const MACRO = [
  { wn: 1, start: '2026-07-14', phase: 'Consolidation', long: 16, load: 'modéré', longElev: 400, longDesc: 'vallonné', legs: 'progression' },
  { wn: 2, start: '2026-07-21', phase: 'Build', long: 19, load: 'modéré', longElev: 500, longDesc: 'vallonné', legs: 'progression' },
  { wn: 3, start: '2026-07-28', phase: 'Build', long: 22, load: 'modéré+', longElev: 600, legs: 'progression' },
  { wn: 4, start: '2026-08-04', phase: 'Build', long: 24, load: 'soutenu', longElev: 700, legs: 'maintenance' },
  { wn: 5, start: '2026-08-11', phase: 'Deload', long: 16, load: 'léger', longElev: 300, legs: 'maintenance', deload: true },
  { wn: 6, start: '2026-08-18', phase: 'Build', long: 27, load: 'soutenu', longElev: 750, longDesc: 'vallonné', legs: 'maintenance' },
  { wn: 7, start: '2026-08-25', phase: 'Build', long: 29, load: 'soutenu', longElev: 800, legs: 'maintenance' },
  { wn: 8, start: '2026-09-01', phase: 'Deload', long: 22, load: 'modéré', longElev: 500, legs: 'maintenance', deload: true },
  { wn: 9, start: '2026-09-08', phase: 'Peak', long: 32, load: 'élevé', longElev: 900, legs: 'maintenance' },
  { wn: 10, start: '2026-09-15', phase: 'Peak', long: 34, load: 'élevé (proche profil course)', longElev: 950, legs: 'maintenance' },
  { wn: 11, start: '2026-09-22', phase: 'Taper 1', long: 20, load: 'modéré', longElev: 500, legs: 'taper', taper: true },
  { wn: 12, start: '2026-09-29', phase: 'Taper 2', long: 13, load: 'léger', longElev: 300, legs: 'taper', taper: true },
  { wn: 13, start: '2026-10-06', phase: 'Affûtage', long: null, load: '—', legs: 'arrêt', race: true }
]

// ---- Nutrition : cibles par palier de phase (éditables chaque semaine) ----
function tier(wn) {
  if (wn <= 3) return { p: 165, rest: 2600, gym: 2800, dbl: 2900, long: 3000 }
  if (wn <= 5) return { p: 170, rest: 2600, gym: 2800, dbl: 2950, long: 3050 }
  if (wn <= 8) return { p: 175, rest: 2700, gym: 2850, dbl: 3000, long: 3150 }
  if (wn <= 10) return { p: 180, rest: 2750, gym: 2900, dbl: 3050, long: 3250 }
  if (wn <= 12) return { p: 175, rest: 2600, gym: 2750, dbl: 2900, long: 3000 }
  return { p: 170, rest: 2500, gym: 2600, dbl: 2700, long: 2900 }
}
const NUT = {
  legs: 'Jambes lourdes → priorité protéines dans les 2h post-séance.',
  full: 'Deadlift lourd → protéines + glucides post-séance.',
  double: 'Double sollicitation muscu + course → fractionne l’apport sur la journée.',
  long: 'Recharge glucides la veille + pendant (gels/barres), hydratation renforcée.',
  easy: 'Jour léger / récup, apport normal.',
  run: 'Easy, apport normal, hydrate bien.',
  race: 'Petit-déj glucidique 3h avant, gels toutes les 40-45 min, électrolytes/hydratation.'
}
const nut = (wn, kind) => {
  const t = tier(wn)
  const cal = { rest: t.rest, gym: t.gym, dbl: t.dbl, long: t.long, race: t.long + 200 }[
    kind === 'legs' || kind === 'full' ? 'gym' : kind === 'double' ? 'dbl' : kind === 'long' ? 'long' : kind === 'race' ? 'race' : kind === 'run' ? 'gym' : 'rest'
  ]
  return { calories: cal, proteinG: t.p, note: NUT[kind] ?? NUT.easy }
}

// ---- Trames muscu (section 4) ----
const squatNote = (k) =>
  k === 'progression' ? '+2.5 kg vs dernière séance si RPE ≤8' : k === 'taper' ? 'Charge légère, volume réduit' : 'Charge figée (dernier poids maîtrisé), RPE ≤6-7'
const dlNote = (k) =>
  k === 'progression' ? '+5 kg si RPE ≤7' : k === 'taper' ? 'Charge légère, volume réduit' : 'Charge figée, RPE ≤6'
const upperNote = (k) => (k === 'taper' ? 'Maintien, volume réduit' : '+2.5 kg/sem si RPE ≤8 (progression maintenue)')

const lower = (k) => ({
  type: 'gym',
  sessionName: 'Lower Force',
  phase: k,
  exercises: [
    { name: 'Full Squat', sets: 4, reps: 8, note: squatNote(k) },
    { name: 'Romanian Deadlift (barbell)', sets: 3, reps: 8 },
    { name: 'Lunge (barbell)', sets: 3, reps: '10/jambe' },
    { name: 'Seated Leg Curl', sets: 3, reps: '8-12' },
    { name: 'Single Leg Calf Raise', sets: 4, reps: '12-14' }
  ]
})
const upper = (k, run) => ({
  type: run ? 'gym_and_run' : 'gym',
  sessionName: run ? 'Upper Force + Course qualité' : 'Upper Force',
  phase: 'progression',
  exercises: [
    { name: 'Bench Press (barbell)', sets: '4-6', reps: '4-12 pyramide', note: upperNote(k) },
    { name: 'Lat Pulldown', sets: 4, reps: '10-12' },
    { name: 'Shoulder Press (DB)', sets: 4, reps: 12 },
    { name: 'Pull Up', sets: 3, reps: 8 },
    { name: 'EZ Bar Curl', sets: 4, reps: 12 },
    { name: 'Triceps Extension (cable)', sets: 4, reps: 12 }
  ],
  ...(run ? { run } : {})
})
const fullBody = (k) => ({
  type: 'gym',
  sessionName: 'Full Body',
  phase: k,
  exercises: [
    { name: 'Deadlift (trap bar)', sets: '3-4', reps: 8, note: dlNote(k) },
    { name: 'Incline Bench Press (DB)', sets: 4, reps: 10 },
    { name: 'Dumbbell Row', sets: 3, reps: 10 },
    { name: 'Lateral Raise (cable)', sets: '3-4', reps: '10-20' }
  ]
})

// ---- Construit une semaine ----
function buildWeek(m) {
  const days = []
  const day = (i, extra) => ({ date: addDays(m.start, i), label: LABELS[i], ...extra })

  if (m.race) {
    // Semaine 13 — affûtage, arrêt jambes, course le dimanche 11/10 (semaine partielle 6 j).
    days.push(day(0, { type: 'rest_or_easy', description: 'Repos ou footing court 20-30 min très facile', nutrition: nut(m.wn, 'easy') }))
    days.push(day(1, { type: 'rest_or_easy', description: 'Footing court 25 min — arrêt muscu jambes, jambes fraîches', nutrition: nut(m.wn, 'easy') }))
    days.push(day(2, { type: 'rest_or_easy', description: 'Repos complet', nutrition: nut(m.wn, 'easy') }))
    days.push(day(3, { type: 'run', description: 'Activation : 20 min easy + 4 lignes', distanceKm: '4-5', zone: 'Z1 + lignes', nutrition: nut(m.wn, 'run') }))
    days.push(day(4, { type: 'rest_or_easy', description: 'Repos complet, prépa matériel — recharge glucides J-1', nutrition: { calories: tier(m.wn).long, proteinG: tier(m.wn).p, note: 'Recharge glucides J-1, dîner glucidique, hydrate bien.' } }))
    // Jour de course : date figée sur raceDate (2026-10-11).
    days.push({ date: '2026-10-11', label: 'Dimanche', type: 'race', description: 'COURSE — Marathon trail 42K / 900 D+', distanceKm: 42, elevationM: 900, zone: 'Power hike >8%, FC <150, plat ~5:15-5:30/km', goalTime: '4:00:00', nutrition: nut(m.wn, 'race') })
    return days
  }

  // Lundi : récup post-longue (S1 = hike déjà faite).
  if (m.wn === 1) {
    days.push(day(0, { type: 'hike', status: 'done', description: 'Balade / hike easy', distanceKm: 9.3, nutrition: { calories: null, proteinG: 160, note: 'Jour easy, pas de reco spécifique.' } }))
  } else {
    days.push(day(0, { type: 'rest_or_easy', description: 'Repos ou footing 6-7 km très facile (récup post-longue)', nutrition: nut(m.wn, 'easy') }))
  }

  // Mardi : Lower Force
  days.push(day(1, { ...lower(m.legs), nutrition: nut(m.wn, 'legs') }))

  // Mercredi : repos / footing facile (repos complet en deload/taper)
  days.push(
    day(2, {
      type: 'rest_or_easy',
      description: m.deload || m.taper ? 'Repos complet' : 'Repos ou footing 6-8 km très facile',
      ...(m.deload || m.taper ? {} : { distanceKm: '6-8', zone: 'Z1' }),
      nutrition: nut(m.wn, 'easy')
    })
  )

  // Jeudi : Upper Force + course qualité (côtes/tempo)
  const isCotes = m.wn % 2 === 1
  const qualDist = m.deload || m.taper ? '5-6' : '6-8'
  const qualRun = m.deload || m.taper
    ? { distanceKm: qualDist, type: 'easy', description: 'Footing facile (semaine allégée)' }
    : isCotes
      ? { distanceKm: qualDist, type: 'côtes', description: 'Répétitions courtes en montée, marche récup' }
      : { distanceKm: qualDist, type: 'tempo', description: 'Bloc tempo doux Z3 sur terrain roulant' }
  days.push(day(3, { ...upper(m.legs, qualRun), nutrition: nut(m.wn, 'double') }))

  // Vendredi : Full Body (deadlift prioritaire)
  days.push(day(4, { ...fullBody(m.legs), nutrition: nut(m.wn, 'full') }))

  // Samedi : course facile (allégée/coupée en deload)
  if (m.deload) {
    days.push(day(5, { type: 'rest_or_easy', description: 'Repos ou footing 5-6 km très facile', nutrition: nut(m.wn, 'easy') }))
  } else {
    const satDist = m.taper ? '8-10' : m.wn === 1 ? '10-11' : '10-12'
    days.push(day(5, { type: 'run', description: 'Course facile', distanceKm: satDist, zone: 'Z1-Z2', nutrition: nut(m.wn, 'run') }))
  }

  // Dimanche : sortie longue
  days.push(
    day(6, {
      type: 'long_run',
      description: `Sortie longue${m.longDesc ? ' ' + m.longDesc : ''}`,
      distanceKm: m.long,
      elevationM: m.longElev,
      zone: 'Z1-Z2, power hike >8%',
      nutrition: nut(m.wn, 'long')
    })
  )

  return days
}

const program = {
  raceDate: '2026-10-11',
  raceInfo: {
    name: 'Marathon trail auto-organisé',
    distanceKm: 42,
    elevationM: 900,
    goalTime: '4:00:00'
  },
  updatedAt: '2026-07-14',
  weeks: MACRO.map((m) => ({
    weekNumber: m.wn,
    dateStart: m.start,
    dateEnd: m.race ? '2026-10-11' : addDays(m.start, 6),
    phase: m.phase,
    longRunKm: m.long,
    elevationLoad: m.load,
    muscuLegsPhase: m.legs,
    days: buildWeek(m)
  }))
}

writeFileSync(OUT, JSON.stringify(program, null, 2) + '\n')
console.log(`✓ ${OUT} — ${program.weeks.length} semaines, ${program.weeks.reduce((n, w) => n + w.days.length, 0)} jours`)
