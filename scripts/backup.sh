#!/usr/bin/env bash
# Sauvegarde App'lika : base Postgres (pg_dump, format custom) + photos MinIO (archive du volume).
# Usage : bash scripts/backup.sh            (depuis le dépôt, stack Docker lancée)
# Réglages (variables d'environnement, ou .env) :
#   BACKUP_DIR          dossier local des sauvegardes          (défaut : ./backups, ignoré par git)
#   BACKUP_KEEP_DAYS    ancienneté maximale conservée          (défaut : 14)
#   BACKUP_REMOTE       destination HORS de ce serveur, ex. « rclone:bucket/applika » ou « user@hote:/chemin »
# Sans BACKUP_REMOTE, la sauvegarde reste sur la même machine : elle ne protège pas d'une perte du serveur.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PROJECT="${COMPOSE_PROJECT_NAME:-applika}"
mkdir -p "$BACKUP_DIR"
umask 077

echo "› Base Postgres"
DB_FILE="$BACKUP_DIR/applika-db-$STAMP.dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DB_FILE.part"
# Un dump vide ou tronqué ne doit jamais passer pour une sauvegarde valide.
docker compose exec -T postgres pg_restore --list < "$DB_FILE.part" > /dev/null
mv "$DB_FILE.part" "$DB_FILE"

echo "› Photos MinIO"
FILES_FILE="$BACKUP_DIR/applika-files-$STAMP.tar.gz"
docker run --rm -v "${PROJECT}_miniodata:/data:ro" -v "$(cd "$BACKUP_DIR" && pwd):/backup" alpine \
  tar czf "/backup/$(basename "$FILES_FILE").part" -C /data .
mv "$FILES_FILE.part" "$FILES_FILE"

( cd "$BACKUP_DIR" && sha256sum "$(basename "$DB_FILE")" "$(basename "$FILES_FILE")" > "applika-$STAMP.sha256" )

echo "› Rotation (> $KEEP_DAYS jours)"
find "$BACKUP_DIR" -maxdepth 1 -name 'applika-*' -mtime "+$KEEP_DAYS" -delete

if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "› Copie hors serveur : $BACKUP_REMOTE"
  case "$BACKUP_REMOTE" in
    rclone:*) rclone copy "$BACKUP_DIR" "${BACKUP_REMOTE#rclone:}" --include "applika-*$STAMP*" ;;
    *)        rsync -a --include "applika-*$STAMP*" --exclude '*' "$BACKUP_DIR/" "$BACKUP_REMOTE/" ;;
  esac
else
  echo "! BACKUP_REMOTE non défini : sauvegarde locale uniquement." >&2
fi

echo "OK $DB_FILE ($(du -h "$DB_FILE" | cut -f1)), $FILES_FILE ($(du -h "$FILES_FILE" | cut -f1))"
