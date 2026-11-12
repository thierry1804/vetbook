# Exploitation d'App'lika

Tout ce qui suit a été exécuté pour de vrai sur la stack Docker locale (sauvegarde, restauration, déploiement avec
retour arrière, préproduction jetable), sauf mention contraire.

## Où ça tourne

`nginx` (:80, publié sur `HTTP_PORT`, défaut 3080) → `api` (Express, :3000) → `postgres` + `minio`. En production, un tunnel
Cloudflare (`infra/cloudflared/config.yml`) amène `vetbook.boss-etech.net` (et l'hôte admin) vers nginx. Fichiers :
`docker-compose.yml` (base), `docker-compose.prod.yml` (cookies sécurisés), `.env` (secrets, jamais commité).

## Sauvegardes

```bash
bash scripts/backup.sh          # pg_dump + volume MinIO + somme de contrôle, rotation 14 jours
bash scripts/restore-check.sh   # restaure le dernier dump dans une base jetable et compte comptes/animaux
```

- Sans `BACKUP_REMOTE`, la sauvegarde reste **sur la même machine** : elle protège d'une erreur, pas de la perte du
  serveur. **À faire par l'exploitant** : définir `BACKUP_REMOTE` (`rclone:bucket/applika` ou `user@hote:/chemin`) vers un
  stockage hors de ce serveur, puis vérifier qu'un fichier y arrive.
- Cron conseillé (utilisateur qui peut lancer Docker) :
  ```
  15 3 * * *  cd /chemin/vetbook && bash scripts/backup.sh >> /var/log/applika-backup.log 2>&1
  30 3 * * 0  cd /chemin/vetbook && bash scripts/restore-check.sh >> /var/log/applika-backup.log 2>&1
  ```
- **Une sauvegarde jamais restaurée n'est qu'une hypothèse** : la restauration est testée chaque semaine par le second cron.
- Les sauvegardes contiennent des données de santé et des photos : droits `0700`, chiffrement du stockage distant.
  Un compte supprimé disparaît des sauvegardes au bout de 14 jours (c'est écrit dans `legal.html`).

### Restaurer pour de vrai (perte de données)

1. `docker compose stop api nginx`
2. Base : `docker compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'`
   puis `docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < backups/applika-db-AAAAMMJJTHHMMSSZ.dump`
3. Photos : `docker run --rm -v applika_miniodata:/data -v "$PWD/backups:/backup" alpine sh -c 'rm -rf /data/* && tar xzf /backup/applika-files-….tar.gz -C /data'`
4. `docker compose up -d --wait` puis `bash scripts/healthcheck.sh`.

## Déployer et revenir en arrière

```bash
bash scripts/deploy.sh            # sauvegarde, git pull --ff-only, build, attente « healthy », sonde /api/ready
bash scripts/deploy.sh <tag|sha>  # déployer une version précise (retour manuel à une version connue)
```

Si la stack ne devient pas saine, le script revient seul à la version précédente et le dit. **Limite** : une migration de
base (`backend/db/migrations/`) déjà appliquée n'est pas annulée. C'est pourquoi les migrations destructrices se font en
deux déploiements (voir `backend/db/migrations/README.md`) et pourquoi la sauvegarde précède toujours le déploiement.

### Préproduction

```bash
cp .env.example .env.staging   # puis y mettre d'autres secrets et HTTP_PORT=3081
docker compose -p applika-staging --env-file .env.staging up -d --build --wait
docker compose -p applika-staging --env-file .env.staging down -v   # pour tout effacer
```

Projet Compose distinct = volumes, réseau et base distincts de la production. Vérifié : démarrage sur base vierge. À
faire : un second hôte côté tunnel pour l'exposer, et ne **jamais** y copier de vraies données sans les anonymiser.

## Surveillance

- `GET /api/health` : le processus répond. `GET /api/ready` : la base répond (503 sinon). Docker utilise le premier.
- `bash scripts/healthcheck.sh` : à lancer chaque minute depuis cron. Avec `HEALTHCHECK_PING_URL` (healthchecks.io, Uptime
  Kuma « push »), le service externe alerte quand le ping **cesse** d'arriver, même si tout le serveur est tombé.
  **À faire par l'exploitant** : créer ce moniteur et y brancher une alerte (e-mail, Telegram).
- Journaux : JSON, une ligne par requête (méthode, chemin **sans** paramètres, statut, durée, `requestId`). `docker compose
  logs api --since 10m`. Niveau : `LOG_LEVEL=debug|info|warn|error`. Rotation Docker : 5 × 10 Mo par service.
  Chaque réponse porte `X-Request-Id` : c'est l'identifiant à demander à un utilisateur qui signale une erreur.
- Erreurs : `SENTRY_DSN` dans `.env` active le suivi (Sentry ou service compatible), sans corps de requête, cookies, en-têtes
  ni identité. Sans DSN, rien n'est envoyé. **À faire par l'exploitant** : créer le projet et renseigner le DSN.

## Incident

1. `docker compose ps` et `curl -s localhost:3080/api/ready`.
2. `docker compose logs api --since 15m | grep '"level":"error"'` ; relever les `requestId`.
3. Base pleine ou lente : `docker compose exec postgres psql -U $POSTGRES_USER -c 'select count(*) from pg_stat_activity'`.
4. Dernier déploiement fautif : `bash scripts/deploy.sh <sha précédent>`.
5. Données perdues ou corrompues : stopper l'écriture (`docker compose stop api`), puis « Restaurer pour de vrai ».
6. Après coup : noter la chronologie dans `docs/` (cause, détection, correction, ce qui aurait évité l'incident).

Pas de page de statut publique : à décider (un simple fichier statique sur un autre hébergeur suffit).

## Réglages d'environnement utiles

`BACKUP_DIR`, `BACKUP_KEEP_DAYS`, `BACKUP_REMOTE`, `HEALTHCHECK_URL`, `HEALTHCHECK_PING_URL`, `LOG_LEVEL`, `SENTRY_DSN`,
`APP_VERSION` (étiquette de version envoyée avec les erreurs), `COMPOSE_FILES`, `SKIP_PULL`, `SKIP_BACKUP`.
