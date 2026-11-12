#!/usr/bin/env bash
# Déploiement avec sauvegarde préalable et retour automatique à la version précédente si la stack ne devient pas saine.
# Usage : bash scripts/deploy.sh [ref-git]      (sans argument : git pull --ff-only de la branche courante)
# Réglages : COMPOSE_FILES (défaut « docker-compose.yml docker-compose.prod.yml »), SKIP_PULL=1, SKIP_BACKUP=1,
#            HEALTHCHECK_URL (défaut http://localhost:3080/api/ready).
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=()
for f in ${COMPOSE_FILES:-docker-compose.yml docker-compose.prod.yml}; do FILES+=(-f "$f"); done
compose() { docker compose "${FILES[@]}" "$@"; }

previous="$(git rev-parse HEAD)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Des modifications locales non commitées bloquent le déploiement." >&2; exit 1; }

if [ "${SKIP_BACKUP:-0}" != "1" ]; then echo "› Sauvegarde avant déploiement"; bash scripts/backup.sh; fi

if [ -n "${1:-}" ]; then git fetch --tags --quiet && git checkout --quiet "$1"
elif [ "${SKIP_PULL:-0}" != "1" ]; then git pull --ff-only --quiet; fi
target="$(git rev-parse --short HEAD)"
echo "› Déploiement de $target (précédent : ${previous:0:7})"

healthy() { compose up -d --build --wait && bash scripts/healthcheck.sh; }
if healthy; then echo "OK déployé : $target"; exit 0; fi

echo "! $target n'est pas sain : retour à ${previous:0:7}" >&2
git checkout --quiet "$previous"
if healthy; then echo "Retour effectué : ${previous:0:7} tourne. Une migration de base appliquée par $target n'est PAS annulée (voir docs/RUNBOOK.md)." >&2
else echo "!! Le retour a échoué aussi : intervention manuelle (docs/RUNBOOK.md, « Incident »)." >&2; fi
exit 1
