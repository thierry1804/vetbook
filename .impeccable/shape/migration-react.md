# Design Brief — Migration React/Vite

**Statut :** prêt pour `/impeccable craft migration-react`  
**Date :** 2026-07-16  
**Sources :** PRODUCT.md, DESIGN.md, critique accueil, audit technique

---

## Ce qu'on construit

Porter l'application VetBook (carnet santé PWA, ~215 Ko `app.js` monolithique) vers **React 18 + TypeScript + Vite + Tailwind**, en conservant toutes les fonctionnalités actuelles et en corrigeant les dettes UX identifiées à l'accueil.

## Pour qui / contexte

Propriétaires multi-animaux, usage quotidien 30 secondes à 5 minutes — check matinal des rappels, mise à jour fiche, préparation visite véto. État d'esprit : **pragmatique, parfois anxieux** (rappel en retard).

## Succès

- Parité fonctionnelle avec l'app HTML/JS actuelle (localStorage, PWA, offline)
- Accueil repensé : **alertes actionnables** remplacent la grille KPI
- Composants typés, tokens Tailwind alignés sur DESIGN.md
- WCAG 2.1 AA maintenu ou amélioré
- Bundle initial < 500 Ko gzip (hors photos utilisateur)

## Direction visuelle (surface migration)

| Axe | Décision |
|-----|----------|
| Color strategy | **Restrained** — tokens teal/ambre/crème, accent ≤10% |
| Theme | Propriétaire au salon le matin, lumière naturelle, téléphone en main — **clair par défaut**, dark mode conservé |
| Références | 11pets (structure fiche), PetDesk (rappels), Linear (densité sobre des listes) |
| Anti-goals | Pas de rewrite « dashboard SaaS », pas de perte offline, pas de compte obligatoire |

## Scope

| Paramètre | Valeur |
|-----------|--------|
| Fidélité | **Production-ready** |
| Breadth | **Flow complet** (shell + accueil + détail animal + modales) |
| Interactivité | Shipped-quality, états loading/error/empty |
| Priorité | Accueil + shell d'abord, onglets détail en vagues |

## Architecture UX proposée

### Shell (`AppLayout`)
- Header sticky : logo, sélecteur animal, `+ Animal`, sauvegarde, thème
- Router : `/` (accueil), `/animal/:id` (détail), `/communaute` (secondaire)
- FAB contextuel uniquement en vue détail

### Accueil repensé (corrige critique P1)
Remplacer `.home-dashboard` (5 KPI) par :

1. **Bande « À traiter »** — liste compacte max 3 items, chacun : nom animal + action + lien direct (ex. « Luna — vaccin rage en retard → Vaccins »)
2. **Grille cartes animal** — composant signature `PetCard` (photo, nom, espèce, 1 ligne statut urgence, 2 actions max : « Ouvrir » + « Rappels »)
3. **Communauté** — lien discret en pied de page, pas grille égale aux cartes santé

### Détail animal
- Onglets scrollables (Lucide icons, **pas d'emojis**)
- Chaque onglet = route ou query `?tab=vaccins` pour deep-link
- Modales `<dialog>` natif (remplace overlay custom)

### État & données
- `zustand` ou Context + hooks pour `animals[]`, `activeAnimalId`
- Persistance `localStorage` via couche `storage/` (même schéma JSON actuel)
- Service worker inchangé au départ

## Structure code cible

```
src/
  components/
    layout/AppHeader.tsx
    home/TodayAlerts.tsx
    home/PetCard.tsx
    home/PetGrid.tsx
    ui/Button.tsx, Card.tsx, StatusChip.tsx, Tabs.tsx, Dialog.tsx
  pages/
    HomePage.tsx
    AnimalDetailPage.tsx
    CommunityPage.tsx
  hooks/useAnimals.ts, useReminders.ts
  lib/storage.ts
  styles/tokens.css (CSS vars → Tailwind extend)
```

## Tokens Tailwind (`tailwind.config.js`)

Mapper DESIGN.md : `teal`, `teal-dark`, `cream`, `warm-gray`, `ink`, `ink-muted`, `accent-amber`, `status-*`, `rounded-sm/md/lg`.

## Vagues de migration

| Vague | Contenu | Critère done |
|-------|---------|--------------|
| **V0** | Vite entry, tokens, AppLayout, router | `npm run dev` affiche shell |
| **V1** | Accueil (TodayAlerts + PetGrid) + storage | Parité accueil, bug hidden corrigé |
| **V2** | Profil + Photos + Vaccins + Déparas. | 4 onglets fonctionnels |
| **V3** | Onglets restants + PWA + SW | Parité README |
| **V4** | Polish critique/audit | Score critique > 30/40 |

## Edge cases obligatoires

- 0 animal → empty state avec CTA unique
- 1 animal → masquer sélecteur ou le simplifier
- 10+ animaux → tri par urgence, recherche dans sélecteur
- Offline → bannière discrète, pas de blocage
- Onboarding → `<dialog>` dismissible, pas de blocage total accueil

## Contraintes techniques

- React 18, Vite 5, TypeScript strict
- `lucide-react` pour icônes (déjà en deps)
- Pas de Supabase en V1 (dep présent mais non utilisé)
- `@media (prefers-reduced-motion: reduce)` sur animations `fadeInUp`
- Touch targets ≥ 44px mobile

## Checklist Do / Don't (migration)

**Do**
- Réutiliser tokens et composants DESIGN.md
- `<button>` natif partout (pas `div role=button`)
- Tests manuels clavier sur chaque flow critique

**Don't**
- Porter la grille KPI telle quelle
- Porter les emojis comme icônes
- Big-bang rewrite — migrer par vagues testables

## Prochaine étape

Confirmer ce brief → lancer **`/impeccable craft migration-react`** (shape puis build V0+V1).
