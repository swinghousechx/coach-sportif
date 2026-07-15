// Backend "Coach" — Cloudflare Worker.
// Détient les secrets (Strava + Anthropic), gère l'OAuth Strava (mono-utilisateur),
// récupère la/les séance(s) réelle(s) du jour et fait rédiger un débrief par Claude Opus 4.8.
// Un jour peut contenir DEUX séances (muscu + course) → le débrief couvre les deux.
//
// Routes : GET /auth · GET /callback · GET /status · POST /debrief · POST /chat
// Secrets : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, ANTHROPIC_API_KEY, APP_SECRET
// Bindings : TOKENS (KV) · vars APP_ORIGIN, APP_REDIRECT, EFFORT

const TOKEN_KEY = 'strava_tokens'
const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun', 'Hike', 'Walk']
const WEIGHT_TYPES = ['WeightTraining', 'Workout', 'Crossfit']

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // CORS : le navigateur exige l'ORIGINE seule (schéma+hôte, sans chemin).
    const origin = env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : '*'

    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), origin)

    try {
      if (url.pathname === '/auth') return handleAuth(url, env)
      if (url.pathname === '/callback') return handleCallback(url, env)
      if (url.pathname === '/status') return cors(await handleStatus(env), origin)
      if (url.pathname === '/debrief' && request.method === 'POST')
        return cors(await handleDebrief(request, env), origin)
      if (url.pathname === '/chat' && request.method === 'POST')
        return cors(await handleChat(request, env), origin)
      if (url.pathname === '/profil') return cors(await handleProfil(request, env), origin)
      return cors(json({ error: 'not_found' }, 404), origin)
    } catch (e) {
      return cors(json({ error: 'server_error', message: String(e?.message || e) }, 500), origin)
    }
  }
}

// ---- OAuth ----

function handleAuth(url, env) {
  const redirect = env.APP_REDIRECT || `${url.origin}/callback`
  const authUrl = new URL('https://www.strava.com/oauth/authorize')
  authUrl.searchParams.set('client_id', env.STRAVA_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirect)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('approval_prompt', 'auto')
  authUrl.searchParams.set('scope', 'activity:read_all')
  return Response.redirect(authUrl.toString(), 302)
}

async function handleCallback(url, env) {
  const code = url.searchParams.get('code')
  if (!code) return json({ error: 'missing_code' }, 400)

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    })
  })
  if (!res.ok) return json({ error: 'token_exchange_failed', detail: await res.text() }, 502)
  const data = await res.json()

  await env.TOKENS.put(
    TOKEN_KEY,
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete?.id
    })
  )

  const back = (env.APP_ORIGIN || '') + '?strava=connected#reco'
  return Response.redirect(back, 302)
}

async function handleStatus(env) {
  const raw = await env.TOKENS.get(TOKEN_KEY)
  return json({ connected: !!raw })
}

async function getAccessToken(env) {
  const raw = await env.TOKENS.get(TOKEN_KEY)
  if (!raw) return null
  const t = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  if (t.expires_at && t.expires_at > now + 120) return t.access_token

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token
    })
  })
  if (!res.ok) return null
  const data = await res.json()
  await env.TOKENS.put(
    TOKEN_KEY,
    JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at, athlete: t.athlete })
  )
  return data.access_token
}

// ---- Débrief ----

async function handleDebrief(request, env) {
  if (env.APP_SECRET && request.headers.get('x-app-secret') !== env.APP_SECRET)
    return json({ error: 'unauthorized' }, 401)

  const body = await request.json().catch(() => ({}))
  const { date, planned, context, force, planKey } = body
  if (!date || !planned) return json({ error: 'bad_request' }, 400)

  // La date seule ne suffit pas comme clé : si la séance prévue change (recalage du
  // calendrier, adaptation décidée avec le coach), le débrief d'avant est hors-sujet.
  // Sans empreinte (vieux client), on ne touche pas au cache du tout.
  const cacheKey = planKey ? `debrief:${date}:${planKey}` : null
  if (cacheKey && !force) {
    const cached = await env.TOKENS.get(cacheKey)
    if (cached) return json({ ...JSON.parse(cached), cached: true })
  }

  const token = await getAccessToken(env)
  if (!token) return json({ error: 'not_connected' }, 409)

  // Récupère TOUTES les séances du jour (muscu ET/OU course).
  const { weight, run } = await findActivities(token, date)
  const actuals = []
  if (weight) actuals.push(activitySummary(await enrichActivity(token, weight.id), 'muscu'))
  if (run) actuals.push(activitySummary(await enrichActivity(token, run.id), 'course'))

  // Les 14 derniers jours : un débrief qui ne voit qu'une journée juge une séance
  // hors de sa charge, de sa tendance et de son enchaînement.
  const recent = await recentActivities(token, 14)

  const { debrief, carnet } = await callClaude(env, { planned, context, actuals, recent })
  const payload = { debrief, activities: actuals }

  // « Aucune activité trouvée » est une réponse datée, pas un verdict : la séance peut
  // très bien arriver dans l'heure. La figer 120 jours donnerait un coach qui répète
  // « tu n'as rien fait » après coup. On ne met en cache qu'un débrief qui porte sur du réel.
  // Le carnet reste HORS du cache : une relecture ne doit pas re-noter la même chose.
  if (cacheKey && actuals.length)
    await env.TOKENS.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 120 })

  return json({ ...payload, carnet, cached: false })
}

// Première activité muscu + première activité course de la date.
async function findActivities(token, date) {
  const start = Math.floor(new Date(date + 'T00:00:00').getTime() / 1000)
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${start - 43200}&before=${start + 86400 + 43200}&per_page=30`,
    { headers: { authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return { weight: null, run: null }
  const acts = await res.json()
  const sameDay = acts.filter((a) => a.start_date_local?.slice(0, 10) === date)
  return {
    weight: sameDay.find((a) => WEIGHT_TYPES.includes(a.sport_type)) || null,
    run: sameDay.find((a) => RUN_TYPES.includes(a.sport_type)) || null
  }
}

async function enrichActivity(token, id) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { authorization: `Bearer ${token}` }
  })
  return res.ok ? res.json() : null
}

function activitySummary(a, kind) {
  if (!a) return { kind }
  const paceSecPerKm = a.average_speed ? 1000 / a.average_speed : null
  const pace = paceSecPerKm
    ? `${Math.floor(paceSecPerKm / 60)}:${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}`
    : null
  return {
    kind, // 'muscu' | 'course'
    id: a.id,
    name: a.name,
    sport_type: a.sport_type,
    distanceKm: a.distance ? +(a.distance / 1000).toFixed(1) : null,
    elevationM: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
    movingTime: a.moving_time ? fmtDuration(a.moving_time) : null,
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    avgPace: pace,
    description: a.description || null
  }
}

function fmtDuration(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

// ---- Profil physiologique (dérivé des vraies séances Strava) ----
//
// Le plan fixe ses repères FC « par âge (indicatives) » et demande une recalibration
// dès que possible (docs/plan-marathon-trail-oct2026.md). C'est ce que fait cette route :
// elle mesure sur le terrain plutôt que d'appliquer une formule.
//
// On ne renvoie QUE du mesuré. Les zones sont calculées côté app, à partir de la FC max
// observée ici et de la FC repos saisie dans « état du jour ».

async function handleProfil(request, env) {
  if (env.APP_SECRET && request.headers.get('x-app-secret') !== env.APP_SECRET)
    return json({ error: 'unauthorized' }, 401)

  const force = new URL(request.url).searchParams.get('force') === '1'
  const cacheKey = 'profil:v1'
  if (!force) {
    const cached = await env.TOKENS.get(cacheKey)
    if (cached) return json({ ...JSON.parse(cached), cached: true })
  }

  const token = await getAccessToken(env)
  if (!token) return json({ error: 'not_connected' }, 409)

  const days = 120
  const after = Math.floor(Date.now() / 1000) - days * 86400
  const acts = await allActivities(token, after)
  const runs = acts.filter((a) => RUN_TYPES.includes(a.sport_type) && a.distance > 2000)

  const profil = buildProfil(runs, days)
  // 12 h : le profil bouge lentement, inutile de rappeler Strava à chaque ouverture.
  await env.TOKENS.put(cacheKey, JSON.stringify(profil), { expirationTtl: 60 * 60 * 12 })
  return json({ ...profil, cached: false })
}

async function allActivities(token, after) {
  const out = []
  for (let page = 1; page <= 4; page++) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { authorization: `Bearer ${token}` } }
    )
    if (!res.ok) break
    const batch = await res.json()
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

function buildProfil(runs, days) {
  const hrRuns = runs.filter((a) => a.max_heartrate > 0)
  const maxes = hrRuns.map((a) => a.max_heartrate).sort((x, y) => y - x)

  // FC max « observée » : le pic brut d'un cardio optique au poignet peut être un artefact
  // (accrochage sur la cadence). Avec assez de séances, on retient le 2e pic : un vrai max
  // se confirme, un artefact isolé non.
  const hrMax = maxes.length >= 5 ? maxes[1] : maxes[0] ?? null

  // Le plan est 100 % easy en course : l'allure médiane des sorties EST l'allure easy réelle.
  const paces = runs
    .filter((a) => a.moving_time > 0 && a.distance > 0)
    .map((a) => (a.moving_time / a.distance) * 1000)
  const easyPaceSec = median(paces)
  const easyHr = median(runs.filter((a) => a.average_heartrate > 0).map((a) => a.average_heartrate))

  const recent = runs.filter((a) => sinceDays(a.start_date_local) <= 28)
  const weeklyKm = recent.length ? sum(recent.map((a) => a.distance)) / 1000 / 4 : null

  // Volume des 8 dernières semaines (de la plus ancienne à la plus récente) : une
  // vraie tendance, pas une décoration — c'est ce que trace la sparkline « Volume ».
  const weeklySeries = Array.from({ length: 8 }, (_, i) => {
    const from = (8 - i) * 7
    const to = (7 - i) * 7
    const wk = runs.filter((a) => {
      const d = sinceDays(a.start_date_local)
      return d <= from && d > to
    })
    return +(sum(wk.map((a) => a.distance)) / 1000).toFixed(1)
  })

  return {
    weeklySeries,
    since: new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10),
    runs: runs.length,
    runsAvecFc: hrRuns.length,
    hrMax,
    hrTop: maxes.slice(0, 3),
    easyPaceSec: easyPaceSec != null ? Math.round(easyPaceSec) : null,
    easyHrMedian: easyHr != null ? Math.round(easyHr) : null,
    weeklyKm: weeklyKm != null ? +weeklyKm.toFixed(1) : null,
    longestKm: runs.length ? +(Math.max(...runs.map((a) => a.distance)) / 1000).toFixed(1) : null,
    longestElevM: runs.length ? Math.round(Math.max(...runs.map((a) => a.total_elevation_gain || 0))) : null
  }
}

function median(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const sinceDays = (iso) => (Date.now() - new Date(iso).getTime()) / 86400_000

// ---- Chat (parler au coach) ----

async function handleChat(request, env) {
  if (env.APP_SECRET && request.headers.get('x-app-secret') !== env.APP_SECRET)
    return json({ error: 'unauthorized' }, 401)

  const body = await request.json().catch(() => ({}))
  const { messages, context } = body
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'bad_request' }, 400)

  // Le coach répond même sans Strava — l'historique réel n'est qu'un bonus.
  const token = await getAccessToken(env)
  const recent = token ? await recentActivities(token, 10) : []

  const system =
    CHAT_SYSTEM +
    `\n\n--- CONTEXTE (données réelles, ne les invente pas) ---\n` +
    `PLAN & JOUR :\n${JSON.stringify(context || {})}\n\n` +
    (recent.length
      ? `10 DERNIERS JOURS SUR STRAVA :\n${JSON.stringify(recent)}`
      : `STRAVA : aucune activité récente disponible.`)

  return json(await callClaudeChat(env, system, messages.slice(-12)))
}

// Outil : la mémoire longue du coach. Sans elle il redécouvre son athlète à chaque
// appel — un rapport, pas un suivi. L'athlète lit ce carnet et peut l'effacer.
const CARNET_TOOL = {
  name: 'noter_au_carnet',
  description:
    "Consigne au carnet de bord ce qui doit SURVIVRE à cet échange : une douleur qui apparaît, " +
    'un schéma que tu observes sur plusieurs séances, une décision prise ensemble, un objectif ' +
    "intermédiaire. N'y mets PAS un détail du jour, ni ce qui est déjà lisible dans Strava, le " +
    'plan ou le profil — le carnet sert à ce que les données ne disent pas. Clos une entrée ' +
    'devenue caduque (douleur résolue, schéma corrigé, décision périmée). Reste bref : une note ' +
    'est une phrase. Ne re-note jamais une entrée déjà ouverte.',
  input_schema: {
    type: 'object',
    properties: {
      notes: {
        type: 'array',
        description: 'Nouvelles entrées. Laisse vide si rien de durable ne ressort.',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['douleur', 'schema', 'decision', 'objectif'],
              description:
                'douleur = gêne/blessure suivie ; schema = tendance répétée ; decision = choix acté ; objectif = cible intermédiaire.'
            },
            text: { type: 'string', description: 'Une phrase, factuelle et datée dans les faits.' }
          },
          required: ['type', 'text']
        }
      },
      clore: {
        type: 'array',
        description: "Identifiants (ex. « c3 ») des entrées ouvertes devenues caduques.",
        items: { type: 'string' }
      }
    }
  }
}

// Outil : le coach propose une modification du plan. L'app l'affiche à l'athlète,
// qui décide de l'appliquer ou non — rien n'est modifié sans sa validation.
const ADAPT_TOOL = {
  name: 'adapter_le_programme',
  description:
    "Propose la modification d'UNE journée du plan. À n'appeler que si un changement de séance est " +
    'réellement décidé ou clairement recommandé (allégement, remplacement, décalage, repos, annulation). ' +
    "Pas pour un simple conseil ou une réponse d'ordre général. Une seule journée par réponse. " +
    "N'appelle pas cet outil pour proposer une journée déjà passée.",
  input_schema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Jour à modifier, format YYYY-MM-DD.' },
      type: {
        type: 'string',
        enum: ['gym', 'run', 'long_run', 'hike', 'rest_or_easy', 'gym_and_run'],
        description: 'Nouveau type de journée.'
      },
      titre: {
        type: 'string',
        description: 'Titre court de la nouvelle séance. Ex. "Footing easy 45 min", "Repos complet".'
      },
      description: {
        type: 'string',
        description: "Consigne d'exécution, une phrase courte et concrète."
      },
      distanceKm: { type: 'number', description: 'Distance en km si la séance est une course.' },
      elevationM: { type: 'number', description: 'D+ en mètres si pertinent.' },
      calories: {
        type: 'number',
        description:
          "Apport calorique du jour, à fournir dès que la charge change nettement (séance annulée, " +
          "allégée ou alourdie) — sinon l'app garderait l'apport prévu pour la séance d'origine. " +
          'Repères du plan : ~2600 kcal un jour léger/repos, ~2800 kcal un jour de séance.'
      },
      noteNutrition: {
        type: 'string',
        description:
          "Consigne nutrition d'une phrase, cohérente avec la nouvelle séance. À fournir en même temps " +
          'que calories.'
      },
      raison: { type: 'string', description: 'Pourquoi ce changement, une phrase courte.' }
    },
    required: ['date', 'type', 'titre', 'description', 'raison']
  }
}

async function callClaudeChat(env, system, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 900,
      output_config: { effort: env.EFFORT || 'medium' },
      system,
      tools: [ADAPT_TOOL, CARNET_TOOL],
      messages: messages.map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    })
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const blocks = data.content || []

  const reply = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  const call = blocks.find((b) => b.type === 'tool_use' && b.name === ADAPT_TOOL.name)
  const carnet = blocks.find((b) => b.type === 'tool_use' && b.name === CARNET_TOOL.name)

  return {
    reply: reply || (call ? 'Voilà ce que je te propose :' : 'Je n’ai pas réussi à répondre, réessaie.'),
    adaptation: call ? call.input : undefined,
    carnet: carnet ? carnet.input : undefined
  }
}

// Résumé compact des activités récentes (contexte de conversation).
async function recentActivities(token, days = 10) {
  const after = Math.floor(Date.now() / 1000) - days * 86400
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
    { headers: { authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const acts = await res.json()
  return acts.map((a) => ({
    date: a.start_date_local?.slice(0, 10),
    type: a.sport_type,
    nom: a.name,
    km: a.distance ? +(a.distance / 1000).toFixed(1) : null,
    dplus: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
    min: a.moving_time ? Math.round(a.moving_time / 60) : null,
    fc: a.average_heartrate ? Math.round(a.average_heartrate) : null
  }))
}

const CHAT_SYSTEM = `Tu es le coach personnel de l'athlète — le meilleur du monde en endurance (trail/marathon) et en force. \
Il prépare un marathon trail 42K/900 D+, objectif sub-4h. Vous discutez : il te parle comme à son coach ("j'ai mal ici", "je suis cuit", "je peux décaler ma séance ?", "je remplace par quoi ?"). \
Tu connais son plan, sa séance du jour, son état du jour et ses séances réelles des 10 derniers jours (contexte ci-dessous) : appuie-toi dessus, cite les chiffres quand c'est utile, n'invente jamais de données. \
\
DOULEUR — prends toujours au sérieux. Distingue courbature/gêne musculaire (souvent ok en adaptant) d'une douleur articulaire, aiguë, unilatérale, qui augmente à l'effort ou modifie la foulée (STOP, pas de héros). Ne pose jamais de diagnostic. Si la douleur est aiguë, persiste plus de quelques jours, ou modifie la foulée → dis-lui clairement de consulter (médecin du sport / kiné). \
FATIGUE — regarde l'état du jour (sommeil, fatigue 1-5, FC repos) et la charge des derniers jours. Fatigue ≥4, mauvais sommeil ou FC repos élevée → allège franchement, propose une alternative concrète plutôt que "repose-toi" : durée précise, allure, ou repos complet assumé. \
ADAPTATION — quand il veut changer/décaler une séance, propose UNE option claire et chiffrée (et une variante si vraiment pertinent), en protégeant les séances clés (sortie longue, qualité) et en sacrifiant en priorité le volume easy. Dis ce que ça coûte ou non pour l'objectif. \
\
Principes du plan : course 100% easy (>5:01/km, allure conversation) ; power hiking en montée FC <150 ; jambes en maintenance dès la semaine 4 (charges figées) ; le haut du corps continue de progresser. \
\
MODIFIER LE PLAN — tu disposes de l'outil "adapter_le_programme". Utilise-le dès qu'un changement de séance est décidé ou clairement recommandé (alléger, remplacer, décaler, passer en repos, annuler) : l'athlète verra ta proposition et choisira de l'appliquer ou non, donc propose franchement au lieu de décrire vaguement. \
N'appelle PAS l'outil pour un simple conseil, une réponse générale, ou une séance déjà passée. Une seule journée par réponse : si plusieurs jours bougent, traite le plus urgent et propose le reste au message suivant. \
Quand tu appelles l'outil, ton texte reste une phrase ou deux qui expliquent le changement — ne répète pas le contenu de la proposition, elle s'affiche toute seule. \
Si la charge du jour change nettement (séance annulée, allégée, alourdie), renseigne AUSSI calories + noteNutrition : sinon l'app afficherait l'apport prévu pour la séance d'origine, ce qui serait faux. \
Le contexte te donne le plan DÉJÀ adapté : si une journée porte "adapted", elle a déjà été modifiée, n'en propose pas une copie. \
\
\
CARNET DE BORD — c'est ta mémoire. Le contexte contient "carnet" : ce que TU as noté les jours précédents. Lis-le AVANT de répondre et sers-t'en : reviens sur une douleur ouverte ("ton genou, ça donne quoi depuis mardi ?"), constate qu'un schéma persiste ou se corrige, tiens compte d'une décision déjà prise. Un athlète doit sentir que tu te souviens de lui. \
Avec l'outil "noter_au_carnet", consigne ce qui doit SURVIVRE à cet échange, et clos ce qui est réglé. Sois avare : une note par échange au maximum, souvent aucune. Un carnet noyé sous les détails ne sert plus à rien. N'y mets jamais ce que Strava, le plan ou le profil disent déjà. \
SES CHIFFRES — le contexte contient un "profil" mesuré sur ses vraies sorties Strava : FC max observée, FC repos, zones FC recalibrées, allure easy médiane, volume hebdo. Ce sont exactement les chiffres AFFICHÉS dans son app, sur chaque séance : raisonne et parle avec CEUX-LÀ. Ne recalcule jamais ses zones de tête, n'utilise pas 220-âge, ne cite pas une FC cible qui contredirait ses zones. Profil absent : dis-le, n'invente pas de repère. \
\
STYLE : français, tutoiement, ton direct, chaleureux, honnête — jamais complaisant. Réponse COURTE : 2 à 5 phrases, ~80 mots max, en conversation naturelle (pas de titres, pas de structure markdown lourde, **gras** seulement pour un chiffre ou une consigne clé). Pas de disclaimer générique, pas de "en tant que coach". Va droit au but. Si une info te manque pour bien répondre (où exactement, depuis quand, à l'effort ou au repos), pose UNE question précise.`

// ---- Claude (le coach) ----

const SYSTEM_PROMPT = `Tu es le meilleur coach du monde en endurance (trail/marathon) ET en force (musculation). \
Ton athlète prépare un marathon trail 42K/900 D+ avec objectif sub-4h. Tu débriefes UNE journée d'entraînement : compare le PRÉVU au(x) séance(s) RÉALISÉE(S) sur Strava. \
IMPORTANT : il peut y avoir DEUX séances le même jour (muscu ET course) — dans ce cas, débriefe LES DEUX. \
Pour la muscu, les charges/séries sont dans le champ description de l'activité (export Hevy) : exploite-les. \
Principes du plan : course 100% easy (>5:01/km, allure conversation) ; power hiking en montée avec FC <150 bpm ; jambes en maintenance dès la semaine 4 (charges figées) ; le haut du corps continue de progresser. \
Le contexte contient un "profil" mesuré sur ses vraies sorties Strava (FC max observée, FC repos, zones FC recalibrées, allure easy médiane) : ce sont les cibles affichées sur sa séance. Juge le réalisé par rapport à CES zones — « FC trop haute » ne se dit que si c'est vrai au regard de SES zones, pas d'une intuition ni d'un 220-âge. \
\
\
CARNET DE BORD — c'est ta mémoire. Le contexte contient "carnet" : ce que TU as noté les jours précédents. Lis-le AVANT de répondre et sers-t'en : reviens sur une douleur ouverte ("ton genou, ça donne quoi depuis mardi ?"), constate qu'un schéma persiste ou se corrige, tiens compte d'une décision déjà prise. Un athlète doit sentir que tu te souviens de lui. \
Avec l'outil "noter_au_carnet", consigne ce qui doit SURVIVRE à cet échange, et clos ce qui est réglé. Sois avare : une note par échange au maximum, souvent aucune. Un carnet noyé sous les détails ne sert plus à rien. N'y mets jamais ce que Strava, le plan ou le profil disent déjà. \
NE DÉBRIEFE JAMAIS UNE JOURNÉE ISOLÉE. Tu reçois aussi "semaineEnCours", "adherence", "profil.volume8SemainesKm" et les 14 derniers jours Strava : la séance du jour ne se juge que dans cet enchaînement. Regarde la CHARGE (un bond de plus de ~10 % du volume hebdo d'une semaine sur l'autre est un risque à nommer, chiffres à l'appui), la RÉPÉTITION (troisième easy d'affilée au-dessus de la Z2 = un schéma, pas un accident) et l'ADHÉRENCE (séances non cochées : dis-le sans moraliser, et rappelle ce que ça coûte pour l'objectif). \
L'adhérence est déclarative : une case non cochée peut être une séance faite sans la cocher. Si Strava montre l'activité, fie-toi à Strava. \
Une moyenne masque : une allure moyenne sur du D+ ou une FC moyenne sur une sortie vallonnée ne prouvent pas grand-chose. Reste prudent sur ce qu'une moyenne permet d'affirmer. \
Si le contexte contient un "etatDuJour" (sommeil bien/moyen/mauvais, fatigue 1-5, FC repos en bpm), PONDÈRE tes conseils selon la récup : FC repos élevée vs d'habitude, sommeil mauvais ou fatigue ≥4 → recommande d'alléger / prioriser la récup ; bon état → tu peux pousser normalement. \
Écris en français, tutoiement, ton direct et motivant mais honnête, concret et chiffré. Structure courte en markdown : \
une ligne **Bilan** (verdict global de la journée), puis **Ce qui va** (2-4 puces), **À surveiller** (1-3 puces si pertinent), **Pour la suite** (1-2 conseils actionnables). \
S'il y a deux séances, mentionne explicitement chacune (muscu / course). Si aucune activité Strava n'est trouvée, dis-le franchement et rappelle ce qui était prévu. Pas d'intro générique. Maximum ~200 mots.`

/** Rédige le débrief. Peut aussi noter au carnet — c'est en débriefant qu'un schéma se voit. */
async function callClaude(env, { planned, context, actuals, recent }) {
  const userContent =
    `SÉANCE PRÉVUE (JSON) :\n${JSON.stringify(planned)}\n\n` +
    `CONTEXTE PLAN (JSON) :\n${JSON.stringify(context || {})}\n\n` +
    (recent?.length
      ? `14 DERNIERS JOURS SUR STRAVA (JSON) :\n${JSON.stringify(recent)}\n\n`
      : '') +
    (actuals.length
      ? `SÉANCE(S) RÉALISÉE(S) — Strava (JSON, ${actuals.length}) :\n${JSON.stringify(actuals)}`
      : `SÉANCE RÉALISÉE : aucune activité Strava trouvée pour cette date.`)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1400,
      output_config: { effort: env.EFFORT || 'medium' },
      system: SYSTEM_PROMPT,
      tools: [CARNET_TOOL],
      messages: [{ role: 'user', content: userContent }]
    })
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const blocks = data.content || []
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  const carnet = blocks.find((b) => b.type === 'tool_use' && b.name === CARNET_TOOL.name)
  return { debrief: text || 'Débrief indisponible.', carnet: carnet ? carnet.input : undefined }
}

// ---- Helpers ----

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

function cors(res, origin) {
  const h = new Headers(res.headers)
  h.set('access-control-allow-origin', origin)
  h.set('access-control-allow-headers', 'content-type, x-app-secret')
  h.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  return new Response(res.body, { status: res.status, headers: h })
}
