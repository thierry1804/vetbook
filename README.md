# App'lika — Carnet de Santé Animal

Application web de carnet de santé pour animaux de compagnie, en stack **self-hosted** :

- **Nginx** — reverse proxy (seul point d'entrée)
- **Frontend** — JS vanilla (PWA)
- **API Express** — auth, sync, fichiers
- **Postgres** — source de vérité
- **MinIO** — photos / fichiers

## Démarrage rapide (Docker)

```bash
cp .env.example .env
# Éditer POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD, JWT_SECRET
docker compose up --build
```

Ouvre [http://localhost:3080](http://localhost:3080) (port configurable via `HTTP_PORT` dans `.env`).

Services internes (non exposés) : `api`, `postgres`, `minio`. Seul Nginx écoute sur `HTTP_PORT` (8080 par défaut).

## Architecture

```
Navigateur → Nginx (:8080)
               ├─ /        → frontend statique
               └─ /api/*   → api:3000 → Postgres + MinIO
```

## Auth

- Email + mot de passe (argon2)
- Google OAuth (optionnel : `GOOGLE_CLIENT_ID` dans `.env` et `frontend/config.js`)
- Session JWT en cookie **httpOnly** (`SameSite=Lax`)

## Structure

```
frontend/     sources front + build (esbuild → dist/)
backend/      API Express, schéma SQL, scripts
nginx/        reverse proxy + Dockerfile multi-stage
docker-compose.yml
.env.example
```

## Dev sans Docker (optionnel)

```bash
# Terminal 1 — Postgres + MinIO via compose partiel, ou locaux
docker compose up -d postgres minio minio-init

# Terminal 2 — API
cd backend && cp ../.env .env  # DATABASE_URL=postgres://applika:...@localhost:5432/applika
# (exposer temporairement le port 5432 si besoin)
npm start

# Terminal 3 — Front
cd frontend && npm run dev   # Vite :5173, proxy /api → :3000
```

## Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Mettre `COOKIE_SECURE=true` derrière HTTPS. Cloudflare Tunnel (ou autre) peut terminer le TLS **devant** Nginx.

## Variables d'environnement

Voir [`.env.example`](.env.example) : Postgres, MinIO, `JWT_SECRET`, VAPID (push optionnel), `GOOGLE_CLIENT_ID`.

## Rappels push

```bash
docker compose exec api node scripts/send-reminders.mjs
```

À planifier en cron hôte ou conteneur sidecar.

## Compte, sécurité et partage

**Compte et profil** (écran « Compte & paramètres », bureau : navigation latérale, mobile : liste de sections)

- Inscription avec prénom, nom, e-mail, mot de passe et **consentement** aux conditions (`frontend/legal.html`, à faire relire avant toute ouverture publique).
- **E-mails** : confirmation d'adresse, mot de passe oublié, changement d'adresse, invitation au foyer. Configurés par `APP_URL` et `SMTP_*` dans `.env`. Sans `SMTP_HOST`, chaque e-mail est écrit, liens compris, dans les logs de l'API (`docker compose logs api`).
- Boîte de test locale : `SMTP_HOST=mailpit SMTP_PORT=1025 docker compose --profile mail up -d`, puis http://localhost:8025.
- **Sécurité** : changer le mot de passe et l'adresse, appareils connectés (fermer un appareil, « me déconnecter partout »), suppression du compte (base, photos, liens de partage, foyer), sessions révocables côté serveur (`user_sessions`, `users.session_epoch`).
- **Préférences** (`users.preferences`, aussi en local dans `vetbook_prefs`) : canaux et délais de rappel, heures calmes, thème, taille d'affichage, réduction des animations, contraste, format de date, premier jour de la semaine, unités d'affichage (kg/lb, cm/in), animal affiché au lancement. Les délais et heures calmes s'appliquent aux rappels envoyés par `scripts/send-reminders.mjs` et aux notifications de l'application ouverte.
- Personne de confiance, téléphone, photo de profil (stockée dans MinIO, `avatars/<utilisateur>/`).

**Partage** (`frontend/share.html`, lecture seule)

- **Lien vétérinaire** : par animal, durée de 1 à 90 jours, contenu optionnel (notes, photos, coordonnées), révocable. Seul le hachage du jeton est conservé : le lien complet n'est affiché qu'à la création.
- **Foyer** : invitation par e-mail (14 jours), acceptation par l'adresse invitée, accès en lecture seule aux carnets du propriétaire. La modification partagée n'existe pas encore.

**Test de bout en bout** (crée deux comptes jetables et les supprime) :

```bash
SMTP_HOST=mailpit SMTP_PORT=1025 docker compose --profile mail up -d --build api mailpit
docker compose exec -e MAILPIT=http://mailpit:8025 api node scripts/smoke-account.mjs
```
