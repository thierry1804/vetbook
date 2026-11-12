---
name: VetBook
description: Carnet de santé numérique chaleureux pour animaux de compagnie
colors:
  teal: "#0d9488"
  teal-light: "#14b8a6"
  teal-dark: "#0f766e"
  cream: "#fdfaf6"
  warm-gray: "#f5f0eb"
  ink: "#1c1917"
  ink-muted: "#78716c"
  accent-amber: "#f59e0b"
  border-warm: "#e7e2dc"
  card-white: "#ffffff"
  status-ok: "#16a34a"
  status-soon: "#ca8a04"
  status-overdue: "#dc2626"
typography:
  display:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal-dark}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-accent:
    backgroundColor: "{colors.accent-amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "{colors.warm-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  card-default:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: VetBook

## 1. Overview

**Creative North Star: "Le Compagnon Quotidien"**

VetBook se présente comme un compagnon de confiance pour le suivi santé des animaux — simple, clair, proche des applications animaux grand public (11pets, PetDesk), sans infantilisation ni froideur clinique. L'interface privilégie la lisibilité des informations médicales, la bascule rapide entre animaux et les actions quotidiennes (rappels, vaccins, historique).

La densité reste modérée : cartes et listes structurées, navigation par onglets, formulaires en modales. Le teal porte l'identité et la confiance ; l'ambre signale l'action ; le crème et le gris chaud accueillent sans tomber dans le beige « template IA ».

**Key Characteristics:**
- Teal profond en en-tête et actions principales ; ambre réservé aux CTA d'ajout
- Serif Playfair pour les titres, sans DM Sans pour tout le reste — contraste éditorial léger, pas clinique
- Profondeur hybride : surfaces plates au repos, ombre légère sur onglet actif et en-tête sticky
- Statuts santé codés par couleur (vert / ambre / rouge) sur fond teinté, jamais par badges décoratifs partout
- Mode sombre disponible ; mêmes rôles de couleur, fonds assombris

## 2. Colors

Palette chaude et rassurante, ancrée sur le teal vétérinaire et un fond crème légèrement teinté — pas un SaaS bleu-gris, pas un rose « mignon ».

### Primary
- **Teal Profond** (#0f766e) : en-tête sticky, boutons primaires, onglet actif, logo accent. Porte l'identité et la confiance.
- **Teal Vif** (#0d9488) : survol des boutons primaires, focus des champs, liens d'action secondaires.
- **Teal Clair** (#14b8a6) : focus rings, accents en mode sombre.

### Secondary
- **Ambre Action** (#f59e0b) : bouton « + Animal » et CTA d'ajout rapide. Réservé aux actions de création, pas aux décorations.

### Neutral
- **Crème Papier** (#fdfaf6) : fond de page, fond des champs au repos.
- **Gris Chaud** (#f5f0eb) : fond des barres d'onglets, boutons secondaires, zones de repos.
- **Encre** (#1c1917) : texte principal, titres en mode clair.
- **Encre Atténuée** (#78716c) : labels, métadonnées, texte secondaire — toujours ≥4.5:1 sur fond crème.
- **Bordure Chaude** (#e7e2dc) : séparateurs, contours de cartes et champs.
- **Carte Blanche** (#ffffff) : surfaces de contenu (cartes, modales, tableaux).

### Named Rules

**The Action Amber Rule.** L'ambre n'apparaît que sur les actions d'ajout ou de création. Jamais en fond de page, jamais en dégradé décoratif.

**The Teal Header Rule.** Le teal profond vit dans l'en-tête et les actions confirmées. Pas de teal partout sur chaque carte — la rareté structure la hiérarchie.

## 3. Typography

**Display Font:** Playfair Display (Georgia, serif)
**Body Font:** DM Sans (system-ui, sans-serif)

**Character:** Contraste serif/sans sobre — Playfair apporte une touche éditoriale chaleureuse aux titres sans basculer vers le clinique ou l'enfantin. DM Sans assure la lisibilité des données, formulaires et tableaux.

### Hierarchy
- **Display** (700, 28px, line-height 1.2) : titre de page (« Mes animaux »), chiffres du tableau de bord.
- **Headline** (700, 18px, line-height 1.3) : titres de section (`.section-title`), titres de modales.
- **Body** (400, 14px, line-height 1.5) : texte courant, cellules de tableau, paragraphes — max 65–75ch en prose.
- **Label** (600, 11px) : étiquettes de champs (`.info-label`), métadonnées de statut.

### Named Rules

**The Serif Ceiling Rule.** Playfair Display est réservé aux titres et chiffres d'accent. Jamais en corps de texte ou dans les formulaires.

**The Readable Muted Rule.** Le texte atténué (#78716c) reste lisible sur crème ; si le contraste frôle la limite, assombrir vers l'encre plutôt qu'éclaircir « pour l'élégance ».

## 4. Elevation

Profondeur hybride : surfaces plates au repos, élévation légère uniquement en réponse à l'état ou à la position dans la pile.

Les cartes et blocs d'information reposent sur bordure (1px `--border`) sans ombre par défaut. L'onglet actif reçoit une ombre discrète (`0 1px 6px rgba(0,0,0,0.1)`). L'en-tête sticky porte une ombre teal teintée (`0 2px 12px rgba(15,118,110,0.3)`). Les modales flottent au-dessus d'un overlay semi-opaque.

### Shadow Vocabulary
- **Header sticky** (`0 2px 12px rgba(15, 118, 110, 0.3)`) : ancrage de la barre supérieure.
- **Card ambient** (`0 2px 12px rgba(15, 118, 110, 0.12)`) : variable `--shadow`, usage ponctuel.
- **Tab active** (`0 1px 6px rgba(0, 0, 0, 0.1)`) : onglet sélectionné dans la barre d'onglets.

### Named Rules

**The Flat-By-Default Rule.** Les cartes n'ont pas d'ombre au repos. L'élévation signale l'interaction ou la position sticky, pas la décoration.

## 5. Components

Composants tactiles et rassurants — coins légèrement arrondis (8–12px), padding généreux, transitions 200ms.

### Buttons
- **Shape:** Coins arrondis 8–10px (`--radius-sm` / 8px)
- **Primary:** Fond teal profond, texte blanc, padding 12px, font-weight 600
- **Accent:** Fond ambre, texte encre — réservé à « + Animal »
- **Secondary / Ghost:** Fond gris chaud, texte encre — annulation, édition
- **Hover / Focus:** Teal vif au survol primaire ; outline 2px teal ou blanc sur `:focus-visible`

### Chips / Status
- **Style:** Pastilles teintées (vert #dcfce7, ambre #fef9c3, rouge #fee2e2) avec texte assorti
- **State:** `.status-ok`, `.status-soon`, `.status-overdue` — jamais de badge sur chaque ligne sans raison fonctionnelle

### Cards / Containers
- **Corner Style:** 12px (`--radius`)
- **Background:** Blanc sur fond crème
- **Border:** 1px `--border`
- **Internal Padding:** 14–16px

### Inputs / Fields
- **Style:** Bordure 1.5px, fond crème, radius 10px, DM Sans 14px
- **Focus:** Bordure teal vif, pas de glow décoratif
- **Error:** À définir en cohérence avec `.status-overdue` (rouge teinté)

### Navigation
- **Header:** Barre teal 60px, sticky, logo Playfair + accent ambre sur « Book »
- **Tabs:** Barre gris chaud avec onglets pill ; actif = fond blanc + teal + ombre légère
- **Mobile:** Onglets scrollables horizontalement, zones tactiles ≥44px

### Pet Card (signature)
Carte animal sur l'accueil : photo, nom, espèce, stats rapides, boutons primaire/secondaire. Cœur de l'expérience multi-animaux.

## 6. Do's and Don'ts

### Do:
- **Do** utiliser le teal pour l'en-tête, les actions confirmées et l'onglet actif.
- **Do** réserver l'ambre aux actions d'ajout et de création.
- **Do** garder Playfair pour les titres et DM Sans pour les données et formulaires.
- **Do** coder les statuts santé par couleur fonctionnelle (à jour / bientôt / en retard).
- **Do** maintenir WCAG 2.1 AA et des libellés en français simple.

### Don't:
- **Don't** reproduire un dashboard SaaS générique : cartes KPI, dégradés décoratifs, badges et métriques partout.
- **Don't** basculer vers une UI enfantine : emojis omniprésents, couleurs criardes, esthétique jouet.
- **Don't** adopter une ambiance clinique froide : gris hospitalier, jargon médical, dossier impersonnel.
- **Don't** tomber dans le look « template IA » : fond crème/beige par défaut, labels eyebrow en capitales, glassmorphism, grilles de cartes identiques.
- **Don't** utiliser de bordures latérales colorées (>1px) comme accent sur les cartes.
- **Don't** appliquer du texte en dégradé ou du glassmorphism décoratif.
