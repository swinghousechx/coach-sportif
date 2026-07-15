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
  état de connexion · `GET /profil` → profil mesuré (zones FC, allures, force) · `GET|POST /etat` →
  FC de repos et sommeil poussés depuis Apple Santé.
- Les trois temps du coach : `POST /briefing` (avant la séance) · `POST /chat` (pendant) ·
  `POST /debrief` (après).
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

## État du jour depuis Apple Santé (raccourci iOS)

Garmin Connect écrit **FC de repos** et **Sommeil** dans Apple Santé (Réglages → Santé →
Sources de données → Connect). Un raccourci iOS les lit chaque matin et les POSTe sur
`/etat`. Aucun identifiant Garmin ne circule.

Pourquoi ce détour : l'API Health officielle de Garmin est fermée derrière une validation
réservée aux entreprises, et les bibliothèques officieuses exigent le mot de passe Garmin
(CGU violées, compte exposé). Apple Santé est le seul pont propre. Garmin n'y écrit pas la
HRV : inutile de la chercher.

### La recette

**App Raccourcis → Automatisation → Nouvelle → Heure de la journée → 7 h 00 → Exécuter
immédiatement** (décocher « Demander avant d'exécuter »).

Actions, dans l'ordre :

1. **Rechercher des échantillons de santé où** — Type : `Fréquence cardiaque au repos` ·
   Trier par `Date de début` · `Décroissant` · Limite `1`
2. **Obtenir la valeur de** [échantillons de santé] → renommer la variable en `FC`
3. **Obtenir le contenu de** `https://coach-strava.spochat.workers.dev/etat`
   - Méthode : `POST`
   - En-têtes : `x-app-secret` = *(ton APP_SECRET)* · `Content-Type` = `application/json`
   - Corps de la requête : `JSON` → un seul champ :
     - `hrRest` (Nombre) → variable `FC`

Pas de champ `date` : sans elle, le worker prend aujourd'hui. Raccourcis produit
« 15/07/2026 » par défaut, que le format ISO refuse — l'exiger ajoutait une action et le
motif d'échec le plus probable. Le raccourci tourne au réveil : « aujourd'hui » est la
seule réponse sensée.

Le sommeil se rajoute en option : mêmes actions avec le type `Analyse du sommeil`, puis
somme des durées des échantillons « endormi » de la nuit, envoyée en `sleepHours` (heures
décimales). C'est nettement plus laborieux dans Raccourcis — la FC de repos porte
l'essentiel du signal de récup, commence par elle.

### Garde-fous

- `hrRest` n'est accepté qu'entre **25 et 120**, `sleepHours` entre **0,5 et 16**. Un
  raccourci qui rate son coup envoie `0` ou une chaîne vide : la route répond **400** et
  ne stocke rien, plutôt que d'empoisonner le raisonnement du coach.
- La date est **facultative** (aujourd'hui par défaut). Si tu l'envoies, elle doit être **ISO** (`2026-07-15`) — le format français est refusé, avec un message explicite.
- Stockage KV par date, TTL 120 jours.
- Dans l'app, le mesuré **pré-remplit** et la saisie manuelle **gagne toujours** : une
  valeur corrigée à la main n'est jamais réécrasée.
