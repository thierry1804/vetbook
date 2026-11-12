# Sécurité : état et décisions

## En place

- **En-têtes** (`nginx/security-headers.conf`, inclus dans chaque bloc `location` du site public : nginx n'hérite pas des
  `add_header` d'un niveau supérieur dès qu'un niveau inférieur en déclare) : CSP stricte (`script-src 'self'` + Google
  Sign-In, pas de script en ligne), `frame-ancestors 'none'`, `object-src 'none'`, `Permissions-Policy`, `Referrer-Policy`.
  Vérifié par `frontend/tests/csp-stack.mjs` sur la vraie stack (en-têtes + aucune violation à l'usage). Le backoffice a sa CSP.
- **Pas de script en ligne** : les boutons du HTML utilisent `data-open-modal="…"` et `data-scan-booklet`, gérés par un seul
  écouteur (`setupInlineActions`, `app.js`). Ajouter un `onclick="…"` casserait la CSP.
- **Débit** : nginx (`/api/auth/`, 10 req/min) puis limiteurs applicatifs ; les routes IA sont limitées **par compte**
  (`api/_lib/rate-limit.js`). Dépassement : 429 en JSON.
- **Journaux sans secrets** : ni nginx ni l'API n'écrivent la query string (jetons de vérification, de partage).
- **Dépendances** : `npm audit --omit=dev --audit-level=high` en CI ; Dependabot hebdomadaire (`.github/dependabot.yml`).
  `multer` est en 2.x.

## Rotation des secrets

Tous les secrets sont dans `.env`. Sauvegarder avant (`scripts/backup.sh`), modifier, puis `docker compose up -d`.

| Secret | Effet du changement | À refaire ensuite |
|---|---|---|
| `JWT_SECRET` | **toutes les sessions utilisateur sont invalidées** ; la clé de chiffrement des réglages en dérive (`api/_lib/crypto.js`) : la **clé OpenRouter enregistrée devient illisible** ; `ADMIN_JWT_SECRET` suit s'il n'est pas défini | ressaisir la clé OpenRouter dans le backoffice (Système > Assistant IA) ; les utilisateurs se reconnectent |
| `ADMIN_JWT_SECRET` | sessions du backoffice invalidées | se reconnecter au backoffice |
| `POSTGRES_PASSWORD` | à changer **dans Postgres aussi** (`alter user`), sinon l'API ne se connecte plus | redémarrer l'API |
| `MINIO_ROOT_PASSWORD` | idem côté MinIO | redémarrer l'API |
| `SENTRY_DSN`, `HEALTHCHECK_PING_URL` | aucun effet sur les données | — |

Rotation périodique conseillée : tous les 12 mois, et **tout de suite** après le départ d'une personne qui avait accès au serveur.
Cette procédure n'a pas été exécutée de bout en bout : à essayer d'abord sur la préproduction (`docs/RUNBOOK.md`).

## Risque accepté

- **Backoffice, `@tiptap/*` 2.x** (GHSA-cp6q-959q-f8rh, modéré) : `mergeAttributes()` transforme une clé `__proto__` en
  attributs DOM exécutables. Le correctif exige tiptap 3 (changement majeur de l'éditeur). Exploitable seulement par une
  personne qui édite du contenu dans le backoffice (personnel, hôte séparé, session isolée), pas par un utilisateur de l'app.
  À reprendre avec la migration vers tiptap 3 ; l'audit CI exclut `admin/` pour cette raison seulement.

## Images Docker

MinIO reste sur `minio/minio:latest` : j'ai tenté de l'épingler (version `RELEASE.2025-09-07T16-13-09Z`, digest
`sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`, celle qui tourne ici) mais je n'ai **pas pu
vérifier** depuis cette machine que ce tag ou ce digest se télécharge encore sur Docker Hub (le registre a refusé la
requête, et MinIO a réduit la distribution de ses images). Un épinglage non vérifié casserait une nouvelle installation.
À faire : sur une machine qui a accès au registre, `docker pull` du tag ci-dessus ; s'il existe, l'écrire dans
`docker-compose.yml` ; sinon, copier l'image locale vers un registre à toi (`docker tag` puis `docker push`) et l'utiliser.
Postgres reste sur `16-alpine` (version majeure fixe, correctifs mineurs automatiques).

## À faire (non traité ici)

- Test d'intrusion ou revue externe, avant toute communication publique.
- Politique de mots de passe et authentification à deux facteurs pour le backoffice.
- Double authentification (TOTP) du backoffice, test d'intrusion.
