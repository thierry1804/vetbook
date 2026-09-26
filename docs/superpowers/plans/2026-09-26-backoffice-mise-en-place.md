# Backoffice App'lika — mise en place et implications front

**Branche :** `feature/backoffice-foundation`
**Spécification source :** « VetBook — Spécification du backoffice » (doc du 26/09/2026, 16 modules, MVP = 8).
**État au 26/09/2026 :** socle API livré et testé (14 vérifications de fumée), front préparé ; rien n'est déployé en production.

## 1. Ce qui est livré dans cette branche

| Lot de la spec | Livré | Où |
|---|---|---|
| Socle : comptes admin séparés, 2FA TOTP, RBAC (7 rôles), session 8 h, verrouillage après 5 échecs | oui | `backend/api/admin/router.js`, `api/_lib/admin-auth.js`, `api/_lib/totp.js`, `db/admin.sql` |
| Journal d'audit en ajout seul (UPDATE/DELETE refusés en base) | oui | `admin_audit_log` + règles SQL |
| Utilisateurs : recherche (dont n° de puce), fiche 360°, suspension avec motif | oui | `api/admin/resources.js`, `router.js` |
| Référentiels versionnés : brouillon → quatre yeux → publication → `GET /api/ref` | oui | `api/_lib/ref-release.js`, `api/ref/index.js` |
| Contenus, annuaire, urgences par pays (tables + CRUD) | oui | `db/admin.sql`, `resources.js` |
| Abonnements (socle) : formules, matrice de droits, surcharges, `GET /api/me/entitlements`, garde serveur | oui | `api/_lib/entitlements.js`, `api/me/` |
| Journal des envois d'e-mail, suivi du cron de rappels | oui | `mailer.js` → `message_log`, `send-reminders.mjs` → `job_runs` |
| Tableau de bord (indicateurs simples) | oui | `GET /api/admin/dashboard` |
| Seed des référentiels codés en dur (races, vaccins, listes, check-up, conseils, événements, registres) | oui | `scripts/extract-reference.mjs`, `backend/db/seed/reference.json`, `backend/scripts/seed-reference.mjs` |
| **Application d'administration (interface)** | oui | `admin/` (React-Admin + Vite, TypeScript), servie par Nginx sur l'hôte `vetbook-admin.boss-etech.net` ; WYSIWYG (Tiptap) pour conseils et pages ; matrice formules × droits ; versions à quatre yeux ; fiche utilisateur avec actions motivées |
| Paiements automatiques, campagnes, SMS, portail vétérinaire, RGPD, stockage, intégrations | non | V2 / V3 de la spec |

Créer le premier compte : `docker compose exec api node scripts/create-admin.mjs --email a@b.mg --name "Nom" [--role super_admin] [--reset-2fa]`. Le mot de passe vient de `ADMIN_PASSWORD`, sinon il est généré et affiché une seule fois avec l'URI `otpauth://` à scanner.

## 2. Implications côté front (implémentées)

| Sujet | Comportement | Fichiers |
|---|---|---|
| **Référentiels** | Au démarrage, la dernière version en cache (`vetbook_ref`) remplace en mémoire `BREED_DB`, `VACCINE_DB`, symptômes, hygiène, repas, activités + MET, check-up, conseils, événements, formats LOF/LOMAD. Puis `GET /api/ref?since=<version>` en arrière-plan. Les constantes de `app.js` restent le repli hors ligne : sans version publiée, rien ne change. Une entrée invalide est ignorée, jamais bloquante. | `frontend/app.js` (`applyReference`, `refreshReference`) |
| **Pays** | Clé locale `vetbook_country` : vide = tout afficher ; sinon conseils et événements d'un autre pays sont masqués. Aucun écran ne la renseigne encore. | `refCountryOk` |
| **Droits d'abonnement** | `GET /api/me/entitlements` mis en cache (`vetbook_entitlements`). `hasFeature(code)` ouvre tout tant que le serveur n'applique pas les droits (`enforced = false`, valeur par défaut). Garde-fous UI posés : onglet Reproduction et modale Pedigree. Une réponse 402 affiche « n'est pas incluse dans ta formule ». | `hasFeature`, `featureQuota`, `switchTab`, `openModal` |
| **Compte suspendu** | Réponse 403 `ACCOUNT_SUSPENDED` → bandeau rouge persistant ; les données locales restent utilisables. Le bandeau disparaît à la déconnexion. | `data-layer.js` (`apiFetch`), `showSuspendedBanner` |
| **Service worker** | Les réponses d'API authentifiées ne sont plus mises en cache (données de santé) ; seul `/api/ref` l'est, pour le hors ligne. | `frontend/sw.js` |

Vérification hors navigateur : `node scripts/verify-reference-apply.mjs` (4 groupes de contrôles) et `node scripts/verify-breed-standard-urls.mjs`.

## 3. Implications non traitées (à décider ou à faire)

1. **Rappels dupliqués** : les délais de reproduction (28 / 28 / 168 j) existent dans `frontend/app.js` et `backend/api/_lib/reminders.js`. Ils doivent venir du référentiel `registries.delays` pour les deux côtés.
2. **Contenu français** : `DEFAULT_VET_ENTRIES`, le 3115 et les deux centres antipoison ne valent que pour la France. Le front ne lit pas encore `emergencyNumbers` / `clinics` de la release ni ne les masque par pays.
3. **Écran « pays »** dans Mon compte (alimente `vetbook_country`, à relier au profil serveur).
4. **Verrouillage visuel** des fonctionnalités payantes (cadenas, bouton « Passer à Premium ») et lecture de `featureQuota` (nombre d'animaux, stockage photo, membres du foyer) : seuls deux points d'entrée sont gardés.
5. **Événement à tracer** pour le KPI « fonctionnalités bloquées consultées ».
6. **`TERMS_VERSION`** : dérivé aujourd'hui d'une constante API ; à lire de `content_pages` avec ré-acceptation forcée.
7. **Clés `vetbook_*`** du stockage local : ne pas les renommer (perte des données locales).
8. **Schéma** : tout changement doit passer par `ensureSchema` au démarrage (déjà le cas) ; l'oubli d'`apply-schema` avait cassé la connexion Google en production.

## 4. Suite proposée

1. **Application d'administration** (lot suivant, non commencé). Choix à trancher (§5) : React-Admin (retenu par la spec) ou JS vanilla. Servie sur `admin.<domaine>` derrière Nginx, cookie `admin_session` déjà isolé (`path=/api/admin`, `SameSite=strict`).
2. Déploiement : `docker compose up -d --build api nginx` applique `db/admin.sql` (ajouts uniquement, dont `users.status`) puis `seed-reference.mjs` ; publier une première version de référentiels depuis l'API admin.
3. Contenus malgaches (cliniques de garde, événements, vaccins locaux) : à collecter, aucune donnée fournie.
4. Ordre de la spec pour la suite du MVP : Annuaire et urgences Madagascar, Notifications (journaux), Tableau de bord (8 indicateurs), puis V2.

## 5. Décisions ouvertes (reprises de la spec)

- Formules et tarifs : découpage Gratuit / Premium / Éleveur / Cabinet et prix en ariary à valider (les valeurs seedées sont des propositions, `enforced = false`).
- Moyens de paiement au lancement (saisie manuelle au MVP) et canal SMS.
- Langue de l'app : français seul ou aussi malgache.
- Qui fournit les contenus malgaches et qui valide les référentiels médicaux (référent vétérinaire).
- Front d'administration : React-Admin ou vanilla.
- Accès support aux carnets : à mentionner dans les CGU avant activation. Déclaration CMIL : statut à vérifier.

## 6. Mise à jour du 26/09/2026 (après la première mise en production)

- **Interface admin** : `admin/` (build dans `nginx/Dockerfile`, étape `admin-build`). Hôte dédié, CSP stricte, `/api/admin` bloqué sur l'hôte public de l'app. Route Cloudflare à créer : `cloudflared tunnel route dns alterra-dev vetbook-admin.boss-etech.net` + entrée d'ingress vers `localhost:3080`.
- **Formules et prix** : Gratuit / Premium 5 000 Ar (50 000/an, essai 30 j) / Éleveur 20 000 / Cabinet 60 000 ; tout est modifiable (ressources Formules, Fonctionnalités, matrice des droits, réglages). `subscriptions_enforced` reste à `false` tant que la décision n'est pas prise.
- **Front** : urgences et cliniques lues dans la version publiée, par pays (repli FR embarqué seulement si pays vide ou FR) ; écran de choix du pays (premier lancement + Mon compte > Affichage, enregistré dans les préférences serveur) ; panneau « Formule et abonnement » (prix issus de `/api/public-config`, contact et procédure de souscription paramétrables) ; cadenas et message « Voir les formules » ; quota d'animaux contrôlé côté client ; HTML du CMS rendu via une liste blanche ; pages `kind = help` affichées dans le Centre d'aide ; bandeau de maintenance.
- **Serveur** : quotas appliqués (animaux, photos, stockage, foyer, durée des liens) dès que `subscriptions_enforced = true`.
- Reste : SMS, paiements automatiques, campagnes, RGPD, portail vétérinaire (V2/V3 de la spec).
- **Comptes administrateurs** (super admin) : écran « Administrateurs » (création avec mot de passe provisoire + QR TOTP affichés une fois, changement de rôle/statut avec motif, réinitialisation mot de passe + 2FA, déverrouillage, fermeture des sessions ; garde-fous : ni auto-rétrogradation ni dernier super admin) et « Mon profil » (changement de son mot de passe, 12 caractères min., les autres sessions sont fermées). Interface refondue : thème clair/sombre, menu par groupes, palette de commandes Ctrl+K, tableau de bord à cartes.
