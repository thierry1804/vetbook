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

## Risque accepté

- **Backoffice, `@tiptap/*` 2.x** (GHSA-cp6q-959q-f8rh, modéré) : `mergeAttributes()` transforme une clé `__proto__` en
  attributs DOM exécutables. Le correctif exige tiptap 3 (changement majeur de l'éditeur). Exploitable seulement par une
  personne qui édite du contenu dans le backoffice (personnel, hôte séparé, session isolée), pas par un utilisateur de l'app.
  À reprendre avec la migration vers tiptap 3 ; l'audit CI exclut `admin/` pour cette raison seulement.

## À faire (non traité ici)

- Test d'intrusion ou revue externe, avant toute communication publique.
- Politique de mots de passe et authentification à deux facteurs pour le backoffice.
- Rotation documentée de `JWT_SECRET`, `ADMIN_JWT_SECRET` et de la clé de chiffrement des réglages (invalide les sessions).
- Images Docker non épinglées (`minio/minio:latest`) : épingler une version et laisser Dependabot proposer les mises à jour.
