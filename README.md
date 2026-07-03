# Coach — programme de la semaine 🏃‍♂️🏋️

Petite PWA mobile-first qui **affiche** ton programme sportif de la semaine à partir d'un simple
fichier `program.json`. Pas de backend, pas de base de données, pas d'API : tout est statique et
fonctionne **hors-ligne** une fois installée sur l'écran d'accueil.

Stack : Vite + React + TypeScript + Tailwind + `vite-plugin-pwa`. Esthétique « running club ×
liquid glass × Strava » : fond near-black, cartes en glassmorphism, accent orange pour la course,
lime électrique pour la salle.

---

## 🚀 Lancer en local

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (par défaut http://localhost:5173) — idéalement dans ton téléphone
(même réseau Wi-Fi) ou avec les DevTools en mode mobile.

Pour tester le mode installé / offline pour de vrai (service worker actif) :

```bash
npm run build
npm run preview
```

> Le service worker n'est **pas** actif en `npm run dev` (c'est volontaire). Utilise
> `build` + `preview` pour valider l'offline et l'installation.

---

## 📲 Installer la PWA sur iPhone

1. Ouvre l'app dans **Safari** (pas Chrome sur iOS).
2. Touche le bouton **Partager** (le carré avec la flèche vers le haut).
3. Choisis **« Sur l'écran d'accueil »**.
4. Valide — l'icône orange/noir apparaît sur ton écran d'accueil.

Lance-la depuis cette icône : elle s'ouvre en plein écran, sans barre Safari, et fonctionne
hors-ligne après la première ouverture.

**Sur Android (Chrome)** : menu ⋮ → « Installer l'application » / « Ajouter à l'écran d'accueil ».

---

## 🔄 Charger un nouveau programme chaque semaine

Ton coach te régénère un fichier `program.json` chaque semaine. Pour le charger **sans redéployer** :

1. Ouvre l'app.
2. En bas, touche **« Mettre à jour le programme »**.
3. Sélectionne le nouveau `.json` (ou, sur desktop, **glisse-dépose** le fichier n'importe où
   sur la page).

Le fichier est stocké en local (localStorage) et remplace l'affichage immédiatement. Il **prime**
sur le `program.json` embarqué et survit au redémarrage de l'app. Recharge simplement un nouveau
fichier la semaine suivante.

Les coches « fait » sont **persistées**, mais se **réinitialisent automatiquement** au changement
de semaine ISO — inutile de les décocher à la main.

---

## 🧱 Structure du `program.json`

```jsonc
{
  "blockName": "Bloc été — force/masse prioritaire",
  "blockValidUntil": "2026-08-31",   // au-delà → bandeau « Bloc expiré »
  "weekNumber": 1,
  "weekOfBlock": "1/8",
  "priority": "Force / masse",
  "runningRule": "Course 100% easy…",
  "days": [
    {
      "day": "Lundi",
      "type": "course",              // "course" (orange) ou "salle" (lime)
      "title": "Course easy",
      "detail": "45–60 min · …",     // séance course : durée / allure
      "done": false
    },
    {
      "day": "Mardi",
      "type": "salle",
      "title": "Lower — force",
      "exercises": [                  // séance salle : liste d'exercices
        { "name": "Back Squat", "sets": "4×5", "target": "RPE 8" }
      ],
      "note": "Course : repos…",
      "done": false
    }
  ],
  "nutrition": "…",                   // sections repliables en bas
  "progression": "…",
  "vigilance": "…"
}
```

Le jour courant (date système) est mis en avant (bordure accent + auto-scroll au chargement).

---

## 🎨 Icône

L'icône est un placeholder SVG orange/noir ([`public/icon.svg`](public/icon.svg)). Les PNG de la PWA
(`pwa-192`, `pwa-512`, `maskable-512`, `apple-touch-icon`) sont **générés automatiquement** au build
par [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs) — aucune dépendance graphique requise.
Tu peux les régénérer à tout moment avec :

```bash
npm run icons
```

Remplace `public/icon.svg` (et adapte le script) pour ta propre identité.

---

## 📁 Arborescence

```
coach-sportif/
├─ public/
│  ├─ program.json          # programme de départ (exemple rempli)
│  ├─ icon.svg              # icône PWA (placeholder orange/noir)
│  └─ favicon.svg
├─ scripts/
│  └─ generate-icons.mjs    # génère les PNG de la PWA
├─ src/
│  ├─ components/           # Header, DayCard, CollapsibleSection, UpdateButton…
│  ├─ lib/                  # storage (localStorage) + dates (semaine ISO)
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ types.ts
│  └─ index.css
├─ index.html
├─ vite.config.ts           # config PWA (manifest + service worker + offline)
└─ tailwind.config.js
```
