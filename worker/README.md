# Backend Coach — Strava + débrief IA (Cloudflare Worker)

Ce worker détient les secrets (Strava + Anthropic) qu'on ne peut pas cacher dans l'app statique.
Il gère l'OAuth Strava (mono-utilisateur), récupère ta séance réelle, et fait rédiger un **débrief
par Claude Opus 4.8**. Coût : Strava + hébergement = **0 €** ; le débrief IA = quelques centimes.

Suis les étapes dans l'ordre. ~20 min la première fois.

---

## 1. Créer l'app API Strava

1. Va sur **https://www.strava.com/settings/api**.
2. Crée une application :
   - **Application Name** : Coach (ce que tu veux)
   - **Category** : Training
   - **Website** : `https://swinghousechx.github.io/coach-sportif/`
   - **Authorization Callback Domain** : `TON-SOUS-DOMAINE.workers.dev` *(juste le domaine, sans https:// ni chemin — tu le connaîtras après l'étape 3 ; tu peux revenir le remplir)*
3. Note le **Client ID** et le **Client Secret**.

---

## 2. Compte Cloudflare + Wrangler

1. Crée un compte gratuit sur **https://dash.cloudflare.com/sign-up**.
2. Installe l'outil en ligne de commande :
   ```bash
   npm install -g wrangler
   wrangler login
   ```

---

## 3. Déployer le worker

Depuis ce dossier `worker/` :

```bash
cd worker
npm install

# Crée le stockage (tokens Strava + cache des débriefs) :
wrangler kv namespace create TOKENS
```

La commande renvoie un **id** — colle-le dans `wrangler.toml` à la place de `REMPLACE_PAR_TON_KV_ID`.

Premier déploiement (pour connaître l'URL du worker) :

```bash
wrangler deploy
```

Wrangler affiche l'URL, du type `https://coach-strava.TON-SOUS-DOMAINE.workers.dev`.
Reporte cette URL dans **`wrangler.toml`** (`APP_REDIRECT = ".../callback"`) et complète le
**Authorization Callback Domain** de l'app Strava (étape 1) avec `TON-SOUS-DOMAINE.workers.dev`.

---

## 4. Définir les secrets

```bash
wrangler secret put STRAVA_CLIENT_ID       # colle le Client ID
wrangler secret put STRAVA_CLIENT_SECRET   # colle le Client Secret
wrangler secret put ANTHROPIC_API_KEY      # ta clé API Anthropic (console.anthropic.com)
wrangler secret put APP_SECRET             # un mot de passe que TU choisis (ex. une longue phrase)
```

Puis redéploie pour prendre en compte le KV id et les vars :

```bash
wrangler deploy
```

> **Clé Anthropic** : crée-la sur **https://console.anthropic.com** → API Keys, et recharge un peu de
> crédit (prépayé, min ~5 $). À ton volume, le débrief coûte ~1–2 €/mois.

---

## 5. Brancher l'app sur le worker

Dans le dépôt GitHub `coach-sportif` :

1. **Settings → Secrets and variables → Actions → Variables** → New variable :
   - `COACH_API` = l'URL de ton worker (ex. `https://coach-strava.TON-SOUS-DOMAINE.workers.dev`)
2. **Settings → Secrets and variables → Actions → Secrets** → New secret :
   - `COACH_SECRET` = **la même valeur** que l'`APP_SECRET` mis à l'étape 4.
3. Relance le déploiement de l'app (onglet **Actions** → dernier workflow → Re-run, ou pousse un commit).

Une fois déployée, l'app affiche :
- Onglet **Reco** → bouton **« Connecter Strava »** (fais-le une fois, tu autorises l'accès).
- Sur chaque séance → bouton **« Débrief du coach »**.

---

## Comment ça marche

- `GET /auth` → autorisation Strava · `GET /callback` → stocke les tokens (KV) · `GET /status` →
  état de connexion · `POST /debrief` → récupère ta séance du jour, la compare au prévu, et renvoie
  le débrief rédigé par Claude · `POST /chat` → conversation avec le coach.
- Les tokens Strava se **rafraîchissent** tout seuls. Chaque débrief est **mis en cache par date**
  (régénérable) pour ne pas repayer l'IA à chaque tap.
- `/chat` n'est **pas** mis en cache (chaque message est une vraie question). Le worker y ajoute
  tout seul tes **10 derniers jours d'activités Strava** ; l'app envoie la séance du jour, l'état du
  jour et les 12 derniers messages — ce qui borne le coût à quelques centimes par message.

## Sécurité (à savoir)

- L'endpoint `/debrief` est protégé par `APP_SECRET`. Comme l'app est publique, ce secret est
  « semi-public » (visible dans le JS) : ça élève la barre sans être inviolable. Vu que les données
  sont juste tes stats d'entraînement et que le cache borne la dépense IA, c'est acceptable pour un
  usage perso. Tu peux le changer à tout moment (`wrangler secret put APP_SECRET` + mets à jour
  `COACH_SECRET` côté GitHub).
- Ne mets **jamais** les secrets dans `wrangler.toml` (ils vont dans `wrangler secret put`).

## Local (optionnel)

```bash
wrangler dev   # teste le worker en local sur http://localhost:8787
```
