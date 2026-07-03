# Product

## Register

product

## Users

Un athlète amateur sérieux (course + musculation) qui suit un programme hebdomadaire écrit par
son coach. Contexte d'usage : téléphone en main, souvent en extérieur en plein soleil ou dans une
salle de sport sous néons. Consultation rapide, plusieurs fois par jour — « qu'est-ce que je fais
aujourd'hui ? », « c'était combien de séries ? ». App installée sur l'écran d'accueil, utilisée
hors-ligne.

## Product Purpose

Afficher — pas gérer — le programme sportif de la semaine à partir d'un `program.json`. Pas de
logique métier, pas de backend : c'est un afficheur premium qui rend un fichier statique lisible,
cochable et agréable. Succès = l'athlète ouvre l'app, voit sa séance du jour en une seconde, la
coche quand c'est fait, et n'a jamais à réfléchir à l'outil.

## Brand Personality

Running club × liquid glass × Strava. Trois mots : **sportif, premium, sans friction**. Ton
direct et motivant (tutoiement, « easy strict », « jambes fraîches »). L'app doit donner l'énergie
d'un dossard de course et la clarté d'un tableau de bord d'entraînement.

## Anti-references

- Apps de fitness génériques bleu-corporate / freemium bardées de CTA.
- Dashboards SaaS gris-sur-blanc.
- Décoration gratuite (dégradés violet-bleu, cartes identiques à l'infini, emoji dépareillés).
- Tout ce qui devient illisible en plein soleil (contrastes faibles, gris pâle « élégant »).

## Design Principles

1. **La séance du jour d'abord.** Le jour courant se voit et se trouve sans chercher.
2. **Lisible partout.** Plein soleil comme salle sombre : contraste fort, gros chiffres pour les
   séries×reps, jamais de gris timide sur fond teinté.
3. **La couleur porte du sens.** Orange = course, lime = salle, vert = fait. Jamais de couleur
   décorative sans signification.
4. **Zéro friction.** Coche en un tap, mise à jour en deux taps, tout hors-ligne. L'outil disparaît
   derrière la tâche.
5. **Premium, pas bavard.** Le glass et le mouvement servent la hiérarchie, pas le spectacle.

## Accessibility & Inclusion

Cible WCAG AA : texte corps ≥ 4.5:1, gros texte / composants ≥ 3:1 sur le fond near-black. Cibles
tactiles ≥ 44px. `prefers-reduced-motion` respecté (l'auto-scroll et les transitions ont une
alternative instantanée). La couleur n'est jamais le seul indicateur d'état (coche = remplissage +
barré + grisé, pas juste une teinte).
