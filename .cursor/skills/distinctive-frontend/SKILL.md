---
name: distinctive-frontend
description: Guides creation of distinctive, production-grade frontend UIs that avoid generic AI aesthetics. Use when building components, pages, or apps from user requirements; when the user asks for memorable, bold, or non-template interfaces; or when refining typography, motion, layout, and visual atmosphere beyond defaults.
---

# Interfaces distinctives (anti‑generic)

## Quand déclencher

- L’utilisateur décrit un composant, une page, une appli ou une contrainte technique (stack, perf, a11y).
- Il demande explicitement du caractère, du soin visuel, ou de sortir des patterns « dashboard IA ».

## Avant de coder : direction conceptuelle

Répondre clairement (en interne ou brièvement à l’utilisateur) à :

| Question | Rôle |
|----------|------|
| **Problème & public** | À quoi sert l’interface ? Qui l’utilise ? |
| **Ton visuel** | Choisir une extrême intentionnelle : brutal minimal, maximaliste, rétro‑futuriste, organique, luxe sobre, ludique, éditorial/magazine, brutaliste, art déco, pastel, industriel, etc. |
| **Contraintes** | Framework, cible perf, accessibilité (contraste, focus, reduced motion). |
| **Différenciation** | **Une** chose mémorable : la signature du design (typo, mouvement, composition, texture). |

**Règle** : intentionnalité > intensité. Minimalisme fin et maximalisme assumé sont tous deux valides si exécutés avec précision.

## Implémentation attendue

- Code **réellement fonctionnel** (HTML/CSS/JS, React, Vue, etc. selon le projet).
- Cohérence **totale** avec la direction choisie (couleurs, typo, mouvement, détails).
- **Raffinement** : espacements, hiérarchie, états hover/focus, chargement — pas de demi-mesure décorative.

Complexité du code **alignée sur la vision** : une direction maximaliste exige animations et couches ; une direction minimaliste exige retenue, mesure et détails subtils.

## Piliers esthétiques

### Typographie

- Éviter les familles génériques par défaut (Arial, Inter, Roboto, piles système fades) **sauf** si le projet les impose déjà.
- Préférer une **display** caractère + un **corps** lisible et raffiné ; varier les paires entre projets.
- Ne pas réutiliser mécaniquement les mêmes choix (ex. toujours Space Grotesk).

### Couleur & thème

- **Variables CSS** pour la cohérence (`:root` ou scope composant).
- Dominantes fortes + **accents nets** plutôt que palettes timides et plates.
- Alterner clair / sombre selon le contexte ; ne pas converger vers le « violet sur blanc » cliché.

### Mouvement

- CSS en priorité pour HTML statique ; Motion (Framer) ou équivalent si React et déjà présent dans le projet.
- **Un** moment fort vaut mieux que dix micro-interactions molles : par ex. entrée de page avec `animation-delay` en cascade.
- Scroll et hover **surprenants mais cohérents** ; respecter `prefers-reduced-motion`.

### Composition spatiale

- Layouts **non évidents** : asymétrie, chevauchements, diagonales, rupture de grille, densité contrôlée **ou** vide généreux — selon la direction.

### Fonds & détails

- Atmosphère : textures (grain, bruit), mailles de dégradés, motifs géométriques, transparences superposées, ombres marquées si le ton le permet, bordures décoratives, curseur custom **uniquement** si ça renforce le concept.

## Anti‑patterns (à éviter sauf intention ironique / brief)

- Gradients violets sur blanc « startup générique ».
- Grilles de cartes KPI + graphiques factices pour remplir l’écran.
- Même recette visuelle à chaque génération (même typo, même radius géant partout).
- Animation partout sans hiérarchie.
- Sacrifier l’accessibilité (contraste, clavier, annonces) au nom du style.

## Conflit avec d’autres règles du projet

Si le dépôt ou l’utilisateur impose un design system sobre, utilitaire ou une charte stricte (ex. UI « normale », pas de hero décoratif), **ces règles projet priment** ; appliquer alors cette compétence en **réduisant** le spectacle (précision typo, espacement, états) plutôt qu’en surchargeant.

## Livrable

- Fichiers modifiés ou créés avec imports/dépendances nécessaires.
- Styles structurés (variables, sections claires), pas seulement du HTML jeté.
- Si pertinent : noter en une phrase la **direction esthétique** choisie pour faciliter la reprise ultérieure.
