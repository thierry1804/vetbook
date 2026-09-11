---
name: project-frontend-redesign
description: "Status of the ongoing full visual redesign of VetBook (all screens), using the frontend-design skill — what's done, what's next, and the design decisions to stay consistent with."
metadata:
  node_type: memory
  type: project
---

Full redesign of VetBook's UI is underway across multiple sessions, using the `frontend-design:frontend-design` skill.

**Design decisions — UPDATED 2026-09-10, supersedes the original palette decision below:**
- **Primary brand color is now teal, not indigo** (user, 2026-09-10: "je n'aime pas les boutons très arrondis... l'interface n'est pas suffisamment professionnelle... pour la couleur principale choisis teal"). Picked direction **"A — Précision clinique"** from two mocked-up options: deep sober teal, tight radius scale. Tokens:
  - Light: `--brand: #083F3C`, `--brand-mid: #0B5450` (the interactive color used everywhere), `--brand-light: #4C9B94`, `--coral: #B7433A`, `--coral-hover: #96362F`.
  - Dark: `--brand: #14B8A6`, `--brand-mid: #2DD4BF`, `--brand-light: #5EEAD4`, `--coral: #E8574A`, `--coral-hover: #D14539`.
  - Also updated: `manifest.json`/`index.html` theme-color meta, the default per-animal `themeColor` sentinel (2 spots in `app.js` + 1 in `index.html`, must stay in sync), and every hardcoded brand-color `rgba(...)` literal in `styles.css` (gradients/focus-rings/icon-tints — not `var()`-derived, must be updated by hand on any future palette change).
- **Border-radius consolidated into a 3-tier system** (was 7+ ad hoc values, `6/8/10/12/14/16/20/26px` mixed with 6 different `var(--radius-*)` tokens): `--radius-sm` (8px) for every interactive control (buttons, pills, tabs, toggles, inputs — this fixed the user's main complaint, `.btn-primary`/`.action-pill`/`.reminder-cat` etc. were full pills before); `--radius-lg`/`--radius`/`--radius-card` (12px, now aliased) for cards/sections/modals; `--radius-full` kept only for true circles and *state* indicators (status badges, filter chips, toggle track) — action vs. state is the rule for any new component. ~29 selectors needed manual tier correction beyond the token redefinition — see `git log` around 2026-09-10 if auditing a specific component.
- Single typeface (Plus Jakarta Sans) — unchanged, not part of this pass.
- Signature element: per-pet **health status ring** (`computeHealthStatus()`/`buildHealthRing()` in `app.js`) — unchanged in shape, now renders in teal.

**Verified 2026-09-10:** real browser check in both themes, `getComputedStyle` spot-checks confirmed correct tier/color on key components, zero console errors, lint + build clean.

**Done (2026-08-31, colors now teal per above):** home screen (`#view-home`) rebuilt — pet cards lead with the health ring, secondary actions compacted. Fixed two bugs found along the way (fake vet names, fake tips array).

**Done (2026-09-10):** fiche animal détaillée (pet profile screen) redesigned.

**Done (2026-09-11, via `/impeccable layout`):** the 5 health-table screens (Vaccins, Déparasitage, Consultations, Médicaments, Hygiène) unified onto one `.med-record-card` list pattern — Consultations and Médicaments previously still rendered dead-weight `<table>` markup instead of cards, which was the actual inconsistency (not colors/radius, already fixed). Also fixed along the way: uncolored "Terminé" medication badge (new `.status-neutral` class, `styles.css`), added missing search to Médicaments, removed a duplicate/overridden `@media (max-width:600px)` block for `.table-controls` that a later `@media (max-width:768px)` block already fully superseded (`styles.css` ~3450), and — the one real bug found — search/filter returning zero results silently rendered a blank box on all 5 screens (Vaccins' status-filter had the same gap pre-existing); now shows "Aucun résultat pour cette recherche." Verified in real browser, light+dark, desktop+mobile (375px), incl. confirming Activités/Chaleurs (still real `<table>`-based, untouched, share `.table-controls` CSS) have no regression. `npm run lint` and `npm run build` clean.

**Next:** same discipline on the remaining ~11 screens/tabs (Photos, Nutrition, Activités, Chaleurs, Journal, Check-up, Calendrier, Annuaire, Historique, profil utilisateur, vue communauté) — not yet requested, wait for user direction per the established checkpoint pattern.

**How to resume:** re-read this memory, confirm current `app.js`/`styles.css` state matches, continue with the next screen the user names, same process (brainstorm → critique → build → verify → screenshot → check in).
