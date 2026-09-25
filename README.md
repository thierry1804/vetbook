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
