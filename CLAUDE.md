# App'lika (ex-VetBook)

Carnet de santé numérique pour animaux de compagnie : PWA propriétaire + API + backoffice, auto-hébergés (marché principal : Madagascar, prix en ariary/MGA). Le nom de code « vetbook » survit dans les clés `localStorage` (`vetbook_*`) et le bucket MinIO : ne pas les renommer.

En cas de conflit, ce fichier et le code font foi sur `.claude/memory/` et `docs/` (notes datées, parfois dépassées — ex. Neon/Vercel n'est plus d'actualité).

## Architecture

```
Navigateur → nginx (:3080 en local)
              ├─ /           → frontend/dist (statique)
              ├─ /api/*      → api:3000 (Express) → Postgres 16 + MinIO (photos)
              └─ /api/admin  → 404 ici ; servi seulement sur l'hôte admin (server_name dédié, nginx/nginx.conf)
```

| Dossier | Rôle | Techno |
|---|---|---|
| `frontend/` | PWA propriétaire | JS vanilla ES2019 sans framework ni modules, build esbuild maison (`scripts/build.mjs`) |
| `backend/` | API | Node 24, Express 4, `pg` (SQL brut, pas d'ORM), ESM |
| `admin/` | Backoffice | React 18 + TypeScript + antd 5 + React Router 6, Vite |
| `nginx/` | Reverse proxy + build des deux fronts (Dockerfile multi-étapes) | |
| `docs/` | Specs, plans, audits datés | |

### Front (`frontend/`)
- `app.js` (~10 000 lignes) : toute l'app dans une IIFE. L'état vit dans `state` et est persisté dans `localStorage['vetbook_data']` (`loadState`/`saveState`). API publique minimale exposée sur `window.app` (utilisée par les tests).
- `data-layer.js` : `window.cloudSync` — session, `sync/push` (envoi différé de 4 s après chaque sauvegarde) et `sync/pull`. **Le serveur est la source de vérité dès qu'on est connecté.**
- `account.js` : écrans du compte (`window.applikaAccount`), préférences (`window.applikaPrefs`).
- Pas de `import`/`export` : tout passe par des globals `window.*`. Les nouveaux fichiers JS doivent être ajoutés à `scripts/build.mjs` **et** à `eslint.config.js`.
- Textes : français, tutoiement. `t(key)` pour les chaînes traduites.

### API (`backend/`)
- `server.js` déclare **toutes** les routes (un fichier handler par route sous `api/`), avec les limiteurs de débit. Routeurs dédiés : `api/admin/router.js` (backoffice), `api/me/*`.
- Schéma : `db/schema.sql` + `db/admin.sql`, **réappliqués à chaque démarrage** (`ensureSchema`). Toute modification doit rester idempotente : `create table if not exists`, `alter table … add column if not exists`. Pas d'outil de migration.
- `user_id` vient toujours de la session (`requireUser`), jamais du corps de la requête.
- Synchro : `api/sync/push.js` / `pull.js` + `api/_lib/mapping.js` (correspondance camelCase ↔ snake_case). **Ajouter un champ synchronisé = l'ajouter dans `mapping.js` + une colonne dans `schema.sql`**, sinon il est perdu silencieusement au prochain pull.
- Formules et droits : catalogue des fonctionnalités dans `api/_lib/admin-seed.js` (`FEATURES`), calcul dans `api/_lib/entitlements.js` (`guardFeature` côté route). Côté front, `ROUTE_FEATURES` dans `app.js` mappe écrans/boutons → fonctionnalité (cadenas). Une nouvelle fonctionnalité payante touche ces trois endroits.
- Lecture du carnet par photo : `api/ai/booklet-scan.js` (route) + `api/_lib/booklet.js` (prompt, normalisation pure de la sortie du modèle, rappels estimés depuis les référentiels). **Rien n'est écrit en base** : le front (`app.js`, section « Lecture du carnet ») enregistre seulement les lignes validées par le propriétaire. Modèle de vision : réglage `ai_vision_model`.
- Backoffice CRUD générique : `api/admin/resources.js` (liste blanche de colonnes, audit avant/après automatique).
- Les réglages (`app_settings`) se lisent via `getSetting` ; certaines règles en dépendent (ex. `four_eyes_publish`, `subscriptions_enforced`, tous deux désactivés par défaut).

## Commandes

```bash
npm run install:all       # npm ci dans la racine, backend/, frontend/, admin/
docker compose up --build -d   # stack complète sur http://localhost:3080 (cp .env.example .env d'abord)
npm run dev               # front en Vite :5173, proxy /api → :3000
npm run dev --prefix admin    # backoffice en Vite :5175, proxy /api → stack :3080
```

`.env` n'est pas commité. Mails de test : `SMTP_HOST=mailpit SMTP_PORT=1025 docker compose --profile mail up -d` → http://localhost:8025.

## Vérifier son travail

| Commande | Contenu | Durée | Prérequis |
|---|---|---|---|
| `npm run test:fast` | lint + unitaires backend + typecheck admin | ~15 s | — |
| `npm run test:front` | build du front + smoke Playwright (API simulée, a11y, mobile) | ~20 s | Chromium Playwright |
| `npm run test:integration` | chaque fichier de `backend/tests/` + `scripts/smoke-admin.mjs`, **une base Postgres vierge par fichier** | ~1 min | Docker (ou `QA_PG_ADMIN_URL`) |
| `npm test` | les trois ci-dessus | ~1 min 20 | idem |
| `npm run test:e2e` | navigateur → nginx → API → Postgres, sans simulation : inscription, ajout d'animal, synchro, second appareil | ~15 s | stack Docker lancée (`BASE_URL`, défaut :3080) |

- Un **hook Stop** (`.claude/hooks/check-before-stop.sh`) lance `test:fast` avant de rendre la main s'il y a des changements de code non vérifiés ; un **hook PostToolUse** lint chaque fichier JS modifié. Ne pas les contourner : corriger.
- La CI (`.github/workflows/ci.yml`) lance tout, e2e compris, sur chaque PR.
- Agents dédiés (`.claude/agents/`) : `recette-navigateur` (vérification utilisateur dans Chromium avec captures, sans toucher au code) et `backend-api` (API/SQL avec test d'intégration).
- Lint/build au vert ne prouvent pas qu'une fonctionnalité marche. Pour une modification visible, la vérifier dans un vrai navigateur (Playwright, déjà en devDependency de `frontend/`, Chromium : `npx playwright install chromium`) et regarder une capture d'écran avant d'annoncer que c'est fait.
- Après une modification du front, la stack Docker sert l'ancien build tant qu'on n'a pas fait `docker compose up -d --build nginx` (le front est compilé dans l'image nginx).
- Nouveau test d'intégration : un fichier `.mjs` dans `backend/tests/` est ramassé automatiquement ; il reçoit `DATABASE_URL` (base `applika_qa` jetable), `JWT_SECRET`, `ADMIN_JWT_SECRET`, sans SMTP ni push. Les tests sans base peuvent aussi rejoindre `test:unit` dans `backend/package.json`.
- Comptes créés par les tests e2e : `*@example.invalid`, supprimés en fin de test.

## Pièges connus

- **Ne jamais pousser vers le serveur un animal sans nom** : `pets.name` est `NOT NULL` et un seul rejet annule toute la transaction de `sync/push`. L'app crée un animal vide local au lancement quand il n'y a pas de données (`init` dans `app.js`) ; `pushAllToCloud` le filtre.
- Les fichiers de test laissent des réglages en base : ne pas enchaîner deux fichiers sur la même base (le lanceur s'en charge).
- Les identifiants Postgres `bigint` arrivent en chaînes côté JS : comparer avec `String(a) === String(b)` ou `Number()`.
- Pas plus d'une requête concurrente sur un même client `pg` (`withClient`) : utiliser des requêtes séquentielles ou plusieurs clients.

## Conventions

- Code, commentaires, messages d'erreur et messages de commit **en français**. Commits préfixés par la zone quand elle est claire : `App : …`, `Backoffice : …`, `Backend : …`, `Formules : …`.
- Style : suivre le fichier modifié (le front est en ES5/ES2019 avec `var` et `function`, l'API en ESM moderne). Commentaires rares, qui expliquent le *pourquoi*.
- Travailler sur une branche (ou un worktree), jamais directement sur `master`.

## Design Context

Strategic and visual context for AI agents lives in:

- **PRODUCT.md** — register (`product`), platform (`web`), users, positioning, brand personality, anti-references, design principles, accessibility
- **DESIGN.md** — visual system (teal/ambre/crème, Playfair + DM Sans, components, do's/don'ts) ; le backoffice a le sien : `admin/DESIGN.md`
- **`.impeccable/design.json`** — machine-readable sidecar for live mode panel

### Quick reference

| Aspect | Decision |
|--------|----------|
| Register | Product (app UI, not marketing) |
| Platform | Web PWA |
| Users | Propriétaires multi-animaux, usage quotidien |
| Positioning | Un seul endroit pour tout le suivi santé |
| North Star | « Le Compagnon Quotidien » |
| Personality | Chaleureux, rassurant, familial |
| Primary colors | Teal #0f766e / #0d9488, accent ambre #f59e0b |
| Typography | Playfair Display (titres) + DM Sans (UI) |

Run `/impeccable <command>` for design iteration (critique, audit, polish, live, etc.).
