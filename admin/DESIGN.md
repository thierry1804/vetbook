---
name: App'lika Backoffice
description: Panneau d'instrument de précision pour l'équipe App'lika — neutres chauds, un seul accent, données denses.
colors:
  accent-light: "#1f5c4b"
  accent-dark: "#6bcdac"
  bg-light: "#f6f4f0"
  bg-dark: "#17160f"
  paper-light: "#ffffff"
  paper-dark: "#1e1c15"
  paper-alt-light: "#efece5"
  paper-alt-dark: "#242219"
  text-light: "#201d17"
  text-dark: "#f1ece1"
  text-secondary-light: "#6c6358"
  text-secondary-dark: "#a39b8b"
  divider-light: "rgba(32,29,23,.12)"
  divider-dark: "rgba(241,236,225,.12)"
  success-light: "#3c7a5a"
  success-dark: "#7bbd9a"
  warning-light: "#8f6a28"
  warning-dark: "#d3ac67"
  error-light: "#9a4433"
  error-dark: "#d48f7e"
typography:
  heading:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.012em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 650
    letterSpacing: ".08em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "14px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "20px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-light}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  status-chip:
    backgroundColor: "{colors.success-light}"
    textColor: "{colors.success-light}"
    rounded: "6px"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent-light}"
    rounded: "7px"
    padding: "6px 12px"
---

# Design System: App'lika Backoffice

## Overview

**Creative North Star : « Le panneau d'instrument de précision »**

Le backoffice sert une seule audience : l'équipe App'lika, tous les jours, en tâche. Il ne vend rien et ne raconte rien ; il affiche l'état réel du produit et laisse agir vite. Le parti pris vient d'un relevé de bord — compteurs alignés, filets fins, une seule couleur de marque — plutôt que du kit d'administration générique (cartes icône + libellé + grand chiffre, une teinte différente par métrique) que l'outil portait avant cette refonte.

Rejets confirmés : pas de cartes identiques comme structure de page, pas d'arc-en-ciel décoratif par métrique, pas d'ombres portées (les régions se définissent par des filets de 1px), pas de barre de défilement du système (elle ne se peint pas de façon fiable sur le menu ; l'application dessine la sienne).

**Caractéristiques clés :**
- Palette restreinte : neutres chauds + un seul accent (le vert App'lika), jamais de couleur décorative.
- Vocabulaire d'état fixe (succès/attention/erreur/neutre) dans la même famille de teintes que l'accent.
- Chiffres toujours tabulaires ; une seule famille de caractères pour tout (titres, libellés, données).
- Les listes de faits (fiche utilisateur, administrateur) sont des rangées étiquette/valeur, jamais des tableaux HTML complets pour une poignée de champs.

## Colors

Palette Restreinte : neutres chauds qui évitent le gris froid de MUI, et un seul accent qui porte la sélection, l'action et les séries de données.

### Primary
- **Vert App'lika** (#1f5c4b clair / #6bcdac sombre) : actions principales, sélection active du menu, lien, barres de répartition, montant « succès » du vocabulaire d'état. Utilisé partout où l'interface dit « ceci est vivant / actif / l'action à faire ».

### Neutral
- **Fond** (#f6f4f0 clair / #17160f sombre) : fond de page.
- **Papier** (#ffffff clair / #1e1c15 sombre) : cartes, panneaux, barre d'application.
- **Papier secondaire** (#efece5 clair / #242219 sombre) : menu latéral, zones de contraste léger.
- **Texte** (#201d17 clair / #f1ece1 sombre) et **texte secondaire** (#6c6358 clair / #a39b8b sombre).
- **Filet** (rgba(32,29,23,.12) clair / rgba(241,236,225,.12) sombre) : unique séparateur de région, jamais d'ombre.

### Named Rules
**La règle de l'accent unique.** Une seule couleur porte le sens d'action/sélection sur toute la surface. Aucune carte, métrique ou icône ne reçoit sa propre teinte décorative.
**La règle des quatre états.** Succès, attention, erreur et neutre sont les quatre seules variantes de couleur d'état (`StatusChip`, `Pill`, `MuiAlert`). Elles restent dans la même famille chaude que le reste de la palette — jamais le bleu « info » par défaut de MUI.

## Typography

**Police unique :** Inter (repli système : -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial).

**Caractère :** une seule famille sans empattement porte titres, libellés, corps et données — un outil de produit n'a pas besoin d'une paire display/texte. Échelle fixe en rem (ratio ~1,15), jamais fluide : l'écran d'administration se consulte à une distance et une densité constantes.

### Hierarchy
- **H5** (650, 1.375rem, -.012em) : titre de page.
- **H6** (650, 1.0625rem, -.008em) : titre de carte/panneau.
- **Subtitle2** (650, 0.8125rem) : en-tête de panneau (« Compte », « Sessions actives »…).
- **Body2** (400, 0.8125rem) : texte courant, valeurs de fiche.
- **Overline** (650, 0.6875rem, +.08em, majuscules) : étiquette de groupe de menu, en-tête de section de la matrice des droits.
- **Chiffres** : toujours `font-variant-numeric: tabular-nums` — tableaux, cartes, bande de métriques.

### Named Rules
**La règle du chiffre tabulaire.** Tout nombre affiché (métrique, montant, compteur de table) s'aligne sur une chasse fixe ; jamais de chiffres proportionnels dans une colonne de données.

## Layout

Mise en page structurelle, pas fluide : le menu latéral (256px ouvert / 60px réduit) est fixe en hauteur d'écran avec sa propre barre de défilement dessinée par l'application (voir Composants) ; le contenu central a une largeur maximale par écran (1280px tableau de bord, ~1180px fiches, ~1040px matrice) pour garder les lignes lisibles plutôt que de s'étirer sur un grand écran. Densité : padding de carte 16px, espacement entre blocs 16–20px. Sous le palier `sm` (~600px), les panneaux de données structurels (bande de métriques) basculent d'une bande à colonnes multiples vers une seule colonne à filets horizontaux — jamais un empilement de cartes individuelles qui réintroduirait le gabarit refusé.

## Elevation & Depth

Pas d'ombre portée. La profondeur se lit par le filet de 1px (`divider`) qui délimite chaque région (carte, panneau, en-tête de table) et par la teinte de fond secondaire (`paperAlt`) pour le menu latéral. Seules les vraies incrustations (menus, dialogues, palette de commandes) portent une ombre diffuse, posée sur un filet de bordure.

### Named Rules
**La règle du filet plutôt que l'ombre.** Une région se délimite par un trait de 1px, jamais par une ombre, sauf pour un élément qui flotte réellement au-dessus du reste (dialogue, menu déroulant).

## Shapes

Coins à 8px partout (cartes, boutons, champs, icônes) — une seule valeur, pour que rien ne paraisse plus ou moins « fini » qu'autre chose. Exceptions assumées : les dialogues (14px, pour se distinguer comme une incrustation) et les badges d'état / pastilles (6px, plus petits qu'un bouton). Le menu latéral et la barre d'application n'ont pas de coin (bords d'écran).

## Components

### Buttons
- **Forme :** 8px de rayon, pas d'élévation (`disableElevation`).
- **Primaire :** fond vert accent, texte blanc (clair) / vert très sombre (sombre) — action de validation.
- **Contour / texte :** bordure couleur filet, texte couleur texte — action secondaire, toujours disponible à côté d'un primaire.

### Chips (StatusChip / Pill)
- **StatusChip :** pastille pleine (point + libellé), fond teinté à 10–14 % de la couleur d'état, texte dans la couleur pleine — jamais la couleur « filled » saturée du Chip Material par défaut. Vocabulaire fixe : succès/attention/erreur/neutre.
- **Pill :** même gabarit, teinte neutre fixe — rôles, codes techniques, catégories qui ne sont pas un état.

### Cards / Containers
- **Coin :** 8px.
- **Fond :** papier, pas d'image de fond.
- **Profondeur :** filet 1px, aucune ombre.
- **Padding interne :** 16px.

### Inputs / Fields
- **Style :** fond légèrement teinté (blanc en clair / papier secondaire en sombre), pas de bordure visible au repos, coin 8px.
- **Focus :** contour de la couleur d'accent (comportement MUI standard, non modifié).

### Navigation
- Menu latéral : groupes titrés en overline, entrée active teintée en vert accent doux (10 % d'opacité) avec texte plein accent, icônes 20px. Barre d'application : fond papier, filet inférieur, pas d'ombre, recherche (palette de commandes) et bascule de thème à droite.

### Barre de défilement du menu (signature)
Le menu latéral est fixe en hauteur ; au-delà de la hauteur d'écran, un élément React ordinaire (pas la barre native du navigateur, qui ne se peint pas de façon fiable sur cet élément imbriqué) dessine une piste de 6px cliquable/glissable sur le bord droit du menu, visible seulement quand il y a de quoi défiler.

### Bande de métriques (signature)
Panneau de chiffres dense : au-dessus de `sm`, une bande à colonnes avec filets verticaux et horizontaux (comme un relevé) ; en dessous, une seule colonne à filets horizontaux, étiquette à gauche et valeur à droite. Jamais de cartes séparées par métrique.

## Do's and Don'ts

### Do:
- **Do** garder une seule couleur d'accent sur toute la surface ; les quatre teintes d'état restent dans la même famille chaude.
- **Do** utiliser des chiffres tabulaires pour toute donnée numérique.
- **Do** délimiter les régions par un filet de 1px, jamais par une ombre.
- **Do** regrouper les faits d'une fiche (utilisateur, administrateur) en rangées étiquette/valeur dans un panneau titré, pas en tableau HTML complet.

### Don't:
- **Don't** répéter le gabarit « carte icône + libellé + grand chiffre » pour une série de métriques — c'est le réflexe que cette refonte a corrigé.
- **Don't** laisser `severity="info"` d'un composant MUI retomber sur le bleu par défaut : le thème le mappe sur l'accent (`MuiAlert.standardInfo`/`outlinedInfo`), à vérifier après toute mise à jour de MUI.
- **Don't** empiler les panneaux de métriques en cartes individuelles sur petit écran : le palier mobile reste un relevé à une colonne, filets horizontaux seulement.
- **Don't** introduire un rayon de coin différent de 8px pour un nouveau composant sans raison documentée (les seules exceptions actuelles : dialogues 14px, pastilles 6px).
