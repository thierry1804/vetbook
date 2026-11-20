#!/usr/bin/env bash
# Vérifie qu'une sauvegarde se restaure vraiment : charge le dernier dump dans une base jetable,
# compte les tables et les comptes, puis la supprime. Une sauvegarde jamais restaurée n'est qu'une hypothèse.
# Usage : bash scripts/restore-check.sh [fichier.dump]
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DUMP="${1:-$(ls -1t "$BACKUP_DIR"/applika-db-*.dump 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "Aucune sauvegarde trouvée dans $BACKUP_DIR" >&2; exit 1; }
SUM="$BACKUP_DIR/$(basename "$DUMP" | sed -e 's/-db-/-/' -e 's/\.dump$/.sha256/')"
if [ -f "$SUM" ]; then ( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$SUM")" ); fi

SCRATCH="applika_restore_check"
psql_(){ docker compose exec -T postgres sh -c "psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 -Atc \"$1\""; }
psql_ "drop database if exists $SCRATCH" > /dev/null
psql_ "create database $SCRATCH" > /dev/null
trap 'psql_ "drop database if exists '$SCRATCH'" > /dev/null' EXIT
docker compose exec -T postgres sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $SCRATCH --no-owner" < "$DUMP"
docker compose exec -T postgres sh -c "psql -U \"\$POSTGRES_USER\" -d $SCRATCH -Atc \"select 'tables='||count(*) from information_schema.tables where table_schema='public'; select 'users='||count(*) from users; select 'pets='||count(*) from pets;\""
echo "OK restauration de $(basename "$DUMP") vérifiée"
