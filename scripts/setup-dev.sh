#!/usr/bin/env bash
# Prépare une machine de développement App'lika (y compris pour le travail avec Claude Code).
# Usage : bash scripts/setup-dev.sh        Prérequis : Node 22+, Docker (avec compose), git.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› Dépendances npm (racine, backend, frontend, admin)"
npm run install:all

echo "› Chromium pour les tests navigateur (Playwright)"
(cd frontend && npx playwright install chromium)

if [ ! -f .env ]; then
  echo "› .env local créé avec des secrets aléatoires (jamais commité)"
  sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" \
      -e "s|^MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=$(openssl rand -hex 16)|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env.example > .env
else
  echo "› .env déjà présent : conservé"
fi

chmod +x .claude/hooks/*.sh

echo "› Stack Docker (nginx, API, Postgres, MinIO)"
docker compose up --build -d --wait

echo "› Vérification"
npm run test:fast
npm run test:e2e

cat <<'EOF'

Prêt : http://localhost:3080
Claude Code : ouvrir le dossier, accepter la confiance du projet et l'installation des plugins proposés
(superpowers, frontend-design), puis lire docs/REPRISE.md pour reprendre le travail en cours.
EOF
