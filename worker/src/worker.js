// Backend "Coach" — Cloudflare Worker.
// Rôle : détenir le secret Strava + la clé Anthropic (impossibles à cacher en statique),
// gérer l'OAuth Strava (mono-utilisateur), et produire un débrief de séance rédigé par Claude.
//
// Routes :
//   GET  /auth      → redirige vers l'autorisation Strava
//   GET  /callback  → échange le code, stocke les tokens (KV), renvoie vers l'app
//   GET  /status    → { connected: bool }
//   POST /debrief   → { date, planned, matchType, context } → { debrief, activity, cached }
//
// Secrets (wrangler secret put) : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, ANTHROPIC_API_KEY, APP_SECRET
// Bindings : TOKENS (KV), vars APP_ORIGIN, APP_REDIRECT, EFFORT

const TOKEN_KEY = 'strava_tokens'
const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun', 'Hike', 'Walk']
const WEIGHT_TYPES = ['WeightTraining', 'Workout', 'Crossfit']

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = env.APP_ORIGIN || '*'

    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), origin)

    try {
      if (url.pathname === '/auth') return handleAuth(url, env)
      if (url.pathname === '/callback') return handleCallback(url, env)
      if (url.pathname === '/status') return cors(await handleStatus(env), origin)
      if (url.pathname === '/debrief' && request.method === 'POST')
        return cors(await handleDebrief(request, env), origin)
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

// Renvoie un access token valide (rafraîchit si expiré).
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
  const { date, planned, matchType, context, force } = body
  if (!date || !planned) return json({ error: 'bad_request' }, 400)

  // Cache par date (borne les appels payants). Régénérable via force=true.
  const cacheKey = `debrief:${date}`
  if (!force) {
    const cached = await env.TOKENS.get(cacheKey)
    if (cached) return json({ ...JSON.parse(cached), cached: true })
  }

  const token = await getAccessToken(env)
  if (!token) return json({ error: 'not_connected' }, 409)

  const activity = await findActivity(token, date, matchType)
  const summary = activity && (await enrichActivity(token, activity.id))

  const debrief = await callClaude(env, { planned, context, actual: summary })
  const payload = { debrief, activity: summary ? activitySummary(summary) : null }
  await env.TOKENS.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 120 })
  return json({ ...payload, cached: false })
}

// Cherche l'activité Strava de la date, matchée par type (run / weight).
async function findActivity(token, date, matchType) {
  const start = Math.floor(new Date(date + 'T00:00:00').getTime() / 1000)
  const end = start + 86400
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${start - 43200}&before=${end + 43200}&per_page=30`,
    { headers: { authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const acts = await res.json()
  const wanted = matchType === 'weight' ? WEIGHT_TYPES : RUN_TYPES
  // Même jour local + bon type.
  return (
    acts.find((a) => a.start_date_local?.slice(0, 10) === date && wanted.includes(a.sport_type)) ||
    acts.find((a) => a.start_date_local?.slice(0, 10) === date) ||
    null
  )
}

async function enrichActivity(token, id) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { authorization: `Bearer ${token}` }
  })
  return res.ok ? res.json() : null
}

function activitySummary(a) {
  const paceSecPerKm = a.average_speed ? 1000 / a.average_speed : null
  const pace = paceSecPerKm
    ? `${Math.floor(paceSecPerKm / 60)}:${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}`
    : null
  return {
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

// ---- Claude (le coach) ----

const SYSTEM_PROMPT = `Tu es le meilleur coach du monde en endurance (trail/marathon) ET en force (musculation). \
Ton athlète prépare un marathon trail 42K/900 D+ avec objectif sub-4h. Tu débriefes UNE séance : tu compares le PRÉVU (planifié) au RÉALISÉ (activité Strava). \
Principes du plan : course 100% easy (>5:01/km, allure conversation) sauf qualité ; power hiking en montée avec FC <150 bpm ; jambes en maintenance dès la semaine 4 (charges figées) ; le haut du corps continue de progresser. \
Écris en français, tutoiement, ton direct et motivant mais honnête. Sois concret et chiffré. Structure courte en markdown : \
une ligne **Bilan** (verdict global), puis **Ce qui va** (2-3 puces), **À surveiller** (1-3 puces si pertinent), **Pour la suite** (1-2 conseils actionnables). \
Si aucune activité Strava n'a été trouvée, dis-le franchement et donne un rappel de ce qu'il fallait faire. Pas de blabla, pas d'intro générique. Maximum ~180 mots.`

async function callClaude(env, { planned, context, actual }) {
  const userContent =
    `SÉANCE PRÉVUE (JSON) :\n${JSON.stringify(planned)}\n\n` +
    `CONTEXTE PLAN (JSON) :\n${JSON.stringify(context || {})}\n\n` +
    (actual
      ? `SÉANCE RÉALISÉE — Strava (JSON) :\n${JSON.stringify(actual)}`
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
      max_tokens: 1200,
      output_config: { effort: env.EFFORT || 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    })
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  return text || 'Débrief indisponible.'
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
