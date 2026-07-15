---
name: Coach — programme de la semaine
description: Afficheur premium mobile-first d'un programme sportif hebdomadaire, night-run dark + liquid glass.
colors:
  ink: "#0A0A0B"
  run-orange: "#FC4C02"
  gym-lime: "#B9FF3C"
  success-emerald: "#34D399"
  warning-amber: "#FBBF24"
  error-rose: "#FCA5A5"
  glass-surface: "#FFFFFF0E"
  glass-border: "#FFFFFF14"
  text-primary: "#FFFFFF"
  text-secondary: "#FFFFFFB3"
  text-muted: "#FFFFFF99"
  graphic-muted: "#FFFFFF66"
  mesh-run-core: "#FC4C029E"
  mesh-run-warm: "#FF9E3C57"
  mesh-run-deep: "#785AB447"
  mesh-gym-core: "#B9FF3C73"
  mesh-gym-teal: "#5AC8A04D"
  mesh-cool: "#3C6E964D"
typography:
  display:
    fontFamily: "Oswald, 'Arial Narrow', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Oswald, 'Arial Narrow', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Oswald, 'Arial Narrow', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    letterSpacing: "0.01em"
  label:
    fontFamily: "Oswald, 'Arial Narrow', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  card: "28px"
  inner: "16px"
  chip: "12px"
  pill: "9999px"
spacing:
  card: "16px"
  header: "20px"
  gap: "12px"
components:
  card-glass:
    backgroundColor: "{colors.glass-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  badge-course:
    backgroundColor: "#FC4C0226"
    textColor: "{colors.run-orange}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  badge-salle:
    backgroundColor: "#B9FF3C26"
    textColor: "{colors.gym-lime}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  toggle-done:
    backgroundColor: "{colors.success-emerald}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "34px"
    tapSize: "44px"
  tile:
    backgroundColor: "{colors.glass-surface}"
    borderColor: "{colors.glass-border}"
    rounded: "{rounded.card}"
    padding: "14px"
  icon-badge:
    borderColor: "{colors.graphic-muted}"
    rounded: "{rounded.pill}"
    size: "28-44px"
  arrow-button:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "34px"
    tapSize: "44px"
  button-update:
    backgroundColor: "{colors.glass-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
---

# Design System: Coach — programme de la semaine

## 1. Overview

**Creative North Star: "The Night-Run Dashboard"**

Un tableau de bord d'entraînement qu'on consulte lampe frontale allumée. Le fond est un
near-black profond (#0A0A0B) percé de deux halos discrets — orange en haut, lime à droite — comme
des lampadaires sur une piste de nuit. Par-dessus flottent des surfaces en verre liquide
(glassmorphism : blur, bord blanc à 10 %, fond blanc à 5 %) qui portent la donnée. La couleur n'est
jamais décorative : orange dossard = course, lime électrique = salle, vert = fait. Tout est pensé
pour être lu en une seconde, en plein soleil comme sous les néons d'une salle.

Le système SERT la tâche (afficher le programme du jour), il ne se met pas en scène. Le mouvement
confirme une action — cocher une séance doit être tactile et satisfaisant — mais ne chorégraphie
jamais le chargement : l'app s'ouvre plusieurs fois par jour, elle doit être là, pas se donner en
spectacle. La typo condensée bold (Oswald) donne l'énergie d'un dossard ; le corps (Inter) reste
d'une lisibilité clinique.

Ce système rejette explicitement : le bleu-corporate des apps fitness freemium, le gris-sur-blanc
des dashboards SaaS, la décoration gratuite (dégradés violet-bleu, cartes identiques à l'infini,
emoji dépareillés), et tout gris pâle « élégant » qui devient illisible dehors.

**Key Characteristics:**
- Fond near-black + surfaces liquid glass ; profondeur par la lumière, pas par l'ombre portée.
- Deux accents porteurs de sens : orange course, lime salle. Le vert = état « fait ».
- Typo condensée bold (Oswald) pour titres et chiffres ; Inter pour le corps.
- Contraste fort partout (≥ 4.5:1 corps) — lisible plein soleil comme à la salle.
- Mobile-first strict, une colonne, largeur max ~28rem, safe-areas iOS respectées.
- Mouvement = feedback d'état uniquement ; `prefers-reduced-motion` respecté.

## 2. Colors

Palette drenched-dark : un near-black qui occupe 90 % de la surface, deux accents-signal saturés,
et un vocabulaire sémantique réduit.

### Rampe de texte — la règle qui prime sur le goût

L'app se lit au pouce, dehors, en plein soleil. Le blanc transparent sur nos surfaces donne
**/45 = 4,49:1 (échec), /50 = 5,24, /60 = 7,0**. D'où la rampe, non négociable :

| Rôle | Valeur | Usage |
|---|---|---|
| `text-primary` | `text-white` | Titres, chiffres, données. |
| `text-secondary` | `text-white/70` | Libellés de tuile, corps secondaire. |
| `text-muted` | `text-white/60` | **Plancher absolu de tout texte** (7:1). |
| `graphic-muted` | `text-white/40` | Icônes, séparateurs, barres — **jamais du texte** (3,8:1 ≥ 3:1). |

Un ton en dessous de `/60` sur du texte est un bug, pas une nuance. Le « gris pâle élégant » est
listé dans les anti-références du produit : il ne se rattrape pas en design system.

### Mesh — les nappes floutées

Les `mesh-*` ne sont jamais des aplats : ils vivent sur une couche à part, floutée (34–70 px) puis
débordée (`scale(1.35)`) pour que le flou ne délave pas les bords. Ils portent l'ambiance, jamais
de l'information — aucun texte ne dépend d'eux pour être lisible.

### Primary
- **Dossard Orange** (#FC4C02) : l'accent course. Liseré des cartes course, badge « Course »,
  priorité, icône de la règle course, remplissage de la bande hebdo un jour de course. Orange Strava
  assumé — l'ADN running du produit.

### Secondary
- **Lime Électrique** (#B9FF3C) : l'accent salle. Liseré des cartes salle, badge « Salle », gros
  chiffres séries×reps d'une séance de salle, remplissage de la bande hebdo un jour de salle.

### Tertiary
- **Emerald Succès** (#34D399) : réservé strictement à l'état « fait » (coche remplie, onde de
  validation). Jamais utilisé comme accent décoratif — c'est un signal d'état, pas une couleur de marque.
- **Ambre Vigilance** (#FBBF24) : bandeau « Bloc expiré » et section Vigilance. Avertissement.
- **Rose Erreur** (#FCA5A5) : message d'erreur d'import (JSON invalide). État d'erreur uniquement.

### Neutral
- **Ink** (#0A0A0B) : le fond. Base night-run, ponctuée de deux halos radiaux orange/lime à faible opacité.
- **Text Primary** (#FFFFFF) : titres et données.
- **Text Muted** (blanc à 55–70 %) : détails, métadonnées, labels secondaires. Plancher à 55 %
  (≈ 6:1) — jamais plus pâle.
- **Glass Surface** (blanc à 5 %, #FFFFFF0D) + **Glass Border** (blanc à 10 %, #FFFFFF1A) : les cartes.

### Named Rules
**The Signal Rule.** La couleur code un fait, jamais une humeur. Orange = course, lime = salle,
emerald = fait, ambre = attention, rose = erreur. Un même sens porte toujours la même couleur, sur
tout l'écran. Introduire une couleur « parce que ça fait joli » est interdit.

**The Sunlight Rule.** Tout texte porteur d'information tient ≥ 4.5:1 sur le fond near-black. Le gris
pâle « pour l'élégance » est banni : il rend l'app illisible dehors, exactement le contexte d'usage.

## 3. Typography

**Display Font:** Oswald (fallback 'Arial Narrow', system-ui) — condensée, bold, esprit dossard.
**Body Font:** Inter (fallback system-ui, -apple-system) — humaniste, neutre, ultra-lisible.

**Character:** Un contraste net entre une condensée bold qui crie « sport » sur les titres et les
chiffres, et une grotesque calme qui porte le corps sans fatiguer. Pas de troisième famille.

### Hierarchy
- **Display** (Oswald 700, 1.5rem, LH 1.1, LS -0.01em) : nom du bloc dans le header. `text-balance`.
- **Headline** (Oswald 600, 1.25rem, LH 1.15) : titre de chaque séance. `text-balance`.
- **Data** (Oswald 700, 1.125rem, tabular-nums) : les séries×reps (`4×5`), en couleur d'accent.
  Volontairement gros pour lecture à distance à la salle.
- **Body** (Inter 400, 0.9375rem, LH 1.5) : détails de séance, notes, contenu des sections. Prose
  ≤ 75ch, `text-pretty`.
- **Label** (Oswald 700, 0.6875rem, LS 0.14em, UPPERCASE) : badges de type et noms de jour. Seul
  endroit où les MAJUSCULES sont autorisées.

### Named Rules
**The Bib-Number Rule.** Les chiffres qui comptent (séries×reps, X/7 fait, RPE prioritaire) sont en
Oswald bold, tabulaires, et souvent en couleur d'accent. On doit pouvoir les lire barre en main.

**The Sentence-Case Rule.** Tout est en casse de phrase, SAUF les badges de type de séance et les
labels de jour. Pas de ALL CAPS ailleurs.

## 4. Elevation

Système dark : la profondeur vient de la **lumière et du flou**, pas de l'ombre portée classique.
Chaque carte est une surface de verre (backdrop-blur + fond blanc à 5 % + bord blanc à 10 %) posée
sur le near-black. L'élévation perçue = quantité de lumière traversée, pas noirceur de l'ombre.

### Shadow Vocabulary
- **Glass** (`box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`) :
  ombre de base de toute carte de verre. L'inset blanc simule un bord biseauté qui capte la lumière.
- **Today Glow** (`box-shadow: 0 8px 40px -12px rgba(252,76,2,0.35)` en course, `…rgba(185,255,60,0.28)`
  en salle) : halo coloré sous la carte du jour courant. Guide l'œil, ne décore pas.

### Named Rules
**The No-Drop-Shadow Rule.** Interdit d'empiler des ombres noires opaques pour « détacher » une
carte : on est en dark, ça fait sale. La séparation vient du flou de verre et du bord blanc translucide.

**The Glow-Is-State Rule.** Le halo coloré n'apparaît que sous la carte du jour courant. Un glow qui
n'est pas un signal d'état (aujourd'hui, focus, succès) est proscrit.

## 5. Components

Philosophie composant : **tactile & confiant**. Chaque élément interactif réagit nettement au tap
(scale, onde), avec des affordances marquées. Valider une séance doit être satisfaisant.

### Buttons
- **Shape:** pilule pleine (rayon `pill`, 9999px) pour la coche ; verre à coins doux (rayon `card`,
  24px) pour le bouton « mettre à jour ».
- **Update (glass):** fond verre (blanc 5 %), texte blanc, label Oswald uppercase, padding 14×16px.
- **Hover / Focus:** fond → blanc 8 % au survol ; `active:scale-[0.98]` au tap ; anneau de focus
  clavier blanc 70 % + offset near-black (`.focus-ring`), jamais supprimé sans remplacement.

### Toggle « fait » (composant signature)
- **Style:** cercle de 44px. Non fait = bord blanc 30 %, fond blanc 5 %, coche fantôme. Fait = bord
  et fond emerald pleins, coche encre.
- **Motion:** au tap, `scale 0.85`. À la validation, la coche se **trace** (pathLength 0→1, 320ms
  ease-out-expo) et une **onde emerald** part du cercle (scale 0.9→1.75, opacité 0.55→0, 500ms). Ne
  se joue qu'à la transition non→fait, jamais au montage. En reduced-motion : coche instantanée, pas d'onde.

### Chips / Badges
- **Style:** pilule, label Oswald 11px uppercase LS 0.14em, fond teinté d'accent à 15 %, texte en accent plein.
- **Variants:** « Course » (orange/15 + orange), « Salle » (lime/15 + lime), « Aujourd'hui » (blanc/12 + accent du jour).

### Cards / Containers
- **Corner Style:** rayon `card` (24px).
- **Background:** verre (blanc 5 %) + bord blanc 10 %.
- **Shadow Strategy:** `Glass` par défaut ; `Today Glow` + `bg-white/[0.07]` + anneau d'accent 2px sur le jour courant.
- **Accent:** liseré vertical plein (course/salle) à gauche, largeur 4px, coins arrondis.
- **Internal Padding:** 16px (cartes), 20px (header).
- **Done state:** opacité 0.55 + titre barré (`line-through`) + coche emerald. Trois signaux
  redondants — jamais la couleur seule.

### Inputs / Fields
- **File import:** pas de champ visible ; bouton + drag-and-drop plein écran. L'overlay de dépôt est
  une carte de verre à bord tireté orange. Validation JSON avant remplacement ; erreur = message rose.

### Signature — Bande hebdo (WeekStrip)
Sept segments (un par jour) sous le header. Barre neutre qui se **remplit d'un balayage** (scaleX
0→1, 400ms ease-out-expo) en couleur de type quand la séance est faite ; segment du jour courant
cerclé + glow de son accent. Tap = saut fluide vers la carte du jour. Progression + repérage en un
coup d'œil.

## 6. Do's and Don'ts

### Do:
- **Do** coder le sens par la couleur : orange course, lime salle, emerald fait, ambre attention,
  rose erreur — et rien d'autre (*The Signal Rule*).
- **Do** garder tout texte utile ≥ 4.5:1 sur le near-black ; plancher du muted à 55 % (*The Sunlight Rule*).
- **Do** utiliser Oswald bold tabulaire pour les chiffres qui comptent (séries×reps, X/7) (*The Bib-Number Rule*).
- **Do** faire de la profondeur avec le flou de verre + bord blanc translucide (*The No-Drop-Shadow Rule*).
- **Do** réserver le mouvement au feedback d'état (validation, remplissage, ouverture) et fournir une
  alternative `prefers-reduced-motion` à chaque animation.
- **Do** signaler l'état par trois canaux redondants (opacité + barré + coche), jamais la couleur seule.

### Don't:
- **Don't** virer au bleu-corporate des apps fitness freemium ni au gris-sur-blanc des dashboards SaaS.
- **Don't** poser de dégradé violet-bleu, de `background-clip: text` en dégradé, ni de gris pâle « élégant ».
- **Don't** empiler des cartes identiques à l'infini ni des emoji dépareillés — icônes d'une seule famille (stroke).
- **Don't** utiliser un `border-left`/`border-right` > 1px comme bande d'accent colorée : le liseré de
  carte est un élément plein positionné, pas une bordure latérale détournée.
- **Don't** chorégraphier le chargement de page : l'app s'ouvre 5× par jour, elle affiche, elle ne se
  met pas en scène. Pas de fade-on-scroll générique par section.
- **Don't** ajouter un glow ou une ombre qui ne code pas un état (aujourd'hui, focus, succès) (*The Glow-Is-State Rule*).
- **Don't** passer en ALL CAPS ailleurs que sur les badges de type et les labels de jour (*The Sentence-Case Rule*).
