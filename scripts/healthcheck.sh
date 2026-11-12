#!/usr/bin/env bash
# Sonde de disponibilité à lancer depuis cron (toutes les minutes) ou un superviseur externe.
# Échoue (code 1) si /api/ready ne répond pas 200. Si HEALTHCHECK_PING_URL est défini (healthchecks.io,
# Uptime Kuma « push »…), l'appelle seulement quand tout va bien : l'absence de ping déclenche l'alerte,
# même si ce serveur est complètement hors service.
set -euo pipefail
URL="${HEALTHCHECK_URL:-http://localhost:3080/api/ready}"
curl -fsS --max-time 10 "$URL" > /dev/null || { echo "KO $URL" >&2; exit 1; }
[ -n "${HEALTHCHECK_PING_URL:-}" ] && curl -fsS --max-time 10 "$HEALTHCHECK_PING_URL" > /dev/null
echo "OK $URL"
