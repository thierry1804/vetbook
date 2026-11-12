---
date: 2026-07-16
target: index.html + app.js + styles.css
score: 13
maxScore: 20
p0: 1
p1: 4
p2: 6
p3: 3
---

# Audit technique VetBook

## Audit Health Score: 13/20 — Acceptable, travail significatif

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | `div[role=button]` sans clavier ; avatars `src=""` |
| 2 | Performance | 2 | app.js 215 Ko monolithique, Google Fonts bloquant |
| 3 | Theming | 3 | CSS vars solides, hard-coded dans app.js |
| 4 | Responsive | 3 | Breakpoints présents, quelques cibles <44px |
| 5 | Anti-Patterns | 3 | KPI dashboard + emojis, pas glassmorphism |
| **Total** | | **13/20** | |

## Anti-Patterns Verdict

**PASS avec réserves** — Identité teal/crème intentionnelle (pas template IA pur), mais grille KPI et emojis = tells partiels.

## Issues

### P0
- **[P0] Dashboard visible avec 0 animal** — `styles.css` `.home-dashboard { display: grid }` écrase `[hidden]` — `app.js:554`

### P1
- **[P1] Community cards clavier** — `#btn-show-events` click only, pas Enter/Espace — `index.html:69`
- **[P1] Avatars src vide** — flash broken image — `app.js:619`
- **[P1] Tabs emoji sans texte alternatif** — lecteur d'écran lit emoji — `index.html:139+`
- **[P1] app.js monolithique 215 Ko** — parse/eval coût initial mobile

### P2
- **[P2] Google Fonts externe** — offline PWA dégrade typo
- **[P2] table min-width 500px** — scroll horizontal mobile — `styles.css:1150`
- **[P2] .btn-theme-toggle 36×36** — sous 44px — `styles.css:222`
- **[P2] form-input focus outline:none** — repose sur border-color seul — `styles.css:1821`
- **[P2] Couleurs hard-coded app.js** — `#22c55e`, `#ef4444` hors tokens
- **[P2] lightbox img src=""** — `index.html:1441`

### P3
- **[P3] Contraste muted/cream 4.61:1** — limite AA, fragile si fond change
- **[P3] Lucide en deps mais non utilisé** — bundle futur à optimiser
- **[P3] font-size 0.8rem hors rampe** — `index.html:587`

## Positifs

- Labels `for=` sur formulaires modales
- `:focus-visible` sur boutons principaux et onglets
- Variables CSS `:root` + dark mode `[data-theme=dark]`
- ARIA sur tablist, animal-select, modales
- Service worker + manifest PWA

## Actions recommandées

1. `/impeccable harden accueil` — hidden bug, clavier community, avatars
2. `/impeccable distill accueil` — retirer KPI
3. `/impeccable optimize` — decoupe app.js, fonts locales
4. `/impeccable adapt mobile` — touch targets, tables
5. `/impeccable polish accueil` — passage final
