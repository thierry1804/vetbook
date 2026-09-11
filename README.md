# App'lika — Carnet de Santé Animal

Application web de type **carnet de santé** pour animaux de compagnie : un seul endroit pour la fiche de l’animal, du propriétaire, l’album photo, les vaccins, le déparasitage, les rappels et l’historique.

## Concept et fonctionnalités

**Concept :** App'lika reprend l’idée du HTML fourni (VetCare/VetBook) : une interface par onglets (Profil, Photos, Vaccins, Déparasitage, Alertes, Historique) pour gérer le suivi santé d’un ou plusieurs animaux. Les données sont **sauvegardées dans le navigateur** (localStorage) et restent disponibles entre les sessions.

**Fonctionnalités principales :**
- **Profil** : fiche animal (nom, espèce, race, sexe, date de naissance, poids, couleur, puce, stérilisation, photo de profil) et fiche propriétaire (nom, téléphone, email, clinique, adresse), avec formulaires de modification en modales.
- **Multi-animaux** : bouton « + Animal » et liste déroulante dans l’en-tête pour ajouter un animal et basculer entre eux.
- **Photos** : ajout/suppression de photos dans l’album, affichage en grille, lightbox au clic.
- **Vaccins / Déparasitage** : ajout, liste avec date et rappel, statut (À jour / Bientôt / En retard), suppression.
- **Alertes** : liste des prochains rappels (J-X), préférences de notifications (toggles) sauvegardées par animal.
- **Historique** : timeline regroupant vaccins et déparasitages par date.

L’application est **responsive**, **accessible** (ARIA, rôles, labels) et **compatible** avec les navigateurs modernes.

## PWA (Progressive Web App)

App'lika est une **PWA** : elle peut être installée sur mobile ou bureau (menu « Ajouter à l’écran d’accueil » / « Installer l’application ») et fonctionne en **hors ligne** pour l’interface (données déjà chargées dans localStorage).

- **manifest.json** : nom, couleurs, mode `standalone`, icônes
- **sw.js** : service worker qui met en cache l’app shell (HTML, CSS, JS) et sert la page en cache si le réseau est indisponible
- **Icônes** : `icons/icon-192.png` et `icons/icon-512.png`, générées depuis `icons/source/icon.svg`

Pour que l’installation soit proposée, l’app doit être servie en **HTTPS** (ou en `localhost` en dev).

## Stack

App'lika est **100% JavaScript vanilla** (pas de framework) : `index.html` charge directement `app.js` et `styles.css` via des balises `<script>`/`<link>` classiques, sans étape de build nécessaire pour tourner en local, sans compte.

- `vite` est utilisé uniquement comme **serveur de dev statique** (`npm run dev`), pas comme bundler applicatif.
- `esbuild` sert au **build de prod** (`npm run build`) : minifie `app.js`/`styles.css` dans `dist/` avec cache-busting.
- `vendor/qrcode.min.js` : bibliothèque QR code vendorisée en local (plus de dépendance CDN, nécessaire pour que ça fonctionne aussi hors-ligne via le service worker).

**Synchronisation cloud (optionnelle)** — copier `config.example.js` en `config.js` l'active : le compte, la sauvegarde multi-appareils et les rappels par notification push reposent sur une petite API (dossier `api/`), servie par `server.js` (Express) sur un **VPS**, adossée à une base **Neon** (Postgres). Sans `config.js`, l'app reste 100% locale (localStorage/IndexedDB), comme avant.

- `db/schema.sql` : schéma Postgres à exécuter une fois sur le projet Neon (`node scripts/apply-schema.mjs` si besoin d'un script, ou copier-coller dans la console SQL Neon).
- `api/auth/*` : connexion par lien magique (email) et par Google (`api/auth/google.js`, Google Identity Services) + JWT de session (pas de service d'auth managé — voir `api/_lib/auth.js`).
- `api/sync/push.js` / `api/sync/pull.js` : sauvegarde/restauration de tout l'état local vers/depuis Neon.
- `api/push/subscription.js` : abonnements Web Push.
- `api/_lib/reminders.js` : logique des rappels quotidiens (vaccins, vermifuges, hygiène, médicaments, anniversaires, résumé mensuel, événements canins) + envoi Web Push — appelée par `scripts/send-reminders.mjs` (cron système, voir ci-dessous), pas par une requête HTTP.
- `server.js` : serveur Express qui sert les fichiers statiques (`dist/` si buildé, sinon la racine) et monte les handlers `api/*.js` — point d'entrée du déploiement VPS (`npm start`).
- Variables d'environnement à renseigner dans un fichier `.env` à la racine (chargé par `dotenv`, jamais committé — voir `.gitignore`) : `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PORT` (optionnel, 3000 par défaut). `APP_URL` est optionnelle (retombe sur l'hôte de la requête) mais recommandée derrière un reverse proxy pour que le lien magique pointe toujours vers le bon domaine. `DB_FORCE_IPV4=true` est un filet de sécurité pour les VPS dont l'IPv6 est mal configuré (connexion à Neon qui semble « ne pas répondre » alors que c'est juste IPv6 qui échoue en silence) — à activer seulement si ce symptôme apparaît.
- `GOOGLE_CLIENT_ID` (optionnelle) : active la connexion avec Google. Créer un ID client OAuth "Application Web" dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials), ajouter le(s) domaine(s) de l'app dans "Origines JavaScript autorisées" (pas d'URI de redirection nécessaire). Mettre la même valeur côté serveur (`.env` → `GOOGLE_CLIENT_ID`) et côté client (`config.js` → `googleClientId`, voir `config.example.js`) ; c'est un identifiant public, pas un secret. Sans cette variable, le bouton "Se connecter avec Google" reste masqué et seul le lien magique par email fonctionne.

**Isolation des données par utilisateur :** Neon (Postgres nu) n'a pas d'équivalent aux Row Level Security policies de Supabase (`auth.uid()`). L'isolation est donc appliquée entièrement côté API (`api/_lib/auth.js` + chaque handler de `api/`) : le `user_id` vient uniquement du JWT de session vérifié côté serveur, jamais du payload envoyé par le client, et chaque requête SQL vers une table multi-utilisateur filtre explicitement dessus (`where user_id = $1`) ; toutes les tables enfants portent une contrainte `references users(id) on delete cascade`. Se connecter avec Google ou par lien magique avec le même email aboutit au même compte (`users.google_sub` relié automatiquement à la ligne `users.email` existante, seulement si Google confirme l'email comme vérifié) — jamais à un compte distinct qui dupliquerait les données.

Le dossier `supabase/` (ancienne intégration Supabase — Postgres+RLS, Auth, Edge Function) et l'ancien déploiement Vercel (fonctions serverless individuelles, `vercel.json`) sont abandonnés au profit du VPS ; `supabase/` est conservé pour référence historique, à retirer plus tard.

## Fichiers

- `index.html` — structure sémantique et modales
- `styles.css` — mise en forme responsive (variables CSS, teal/crème/ambre)
- `app.js` — logique (état, localStorage, rendus, enregistrement du SW)
- `manifest.json` — manifeste PWA
- `sw.js` — service worker (cache)
- `icons/` — icônes PWA (192×192, 512×512) + `icons/source/icon.svg` (source éditable)
- `vendor/` — bibliothèques tierces vendorisées en local
- `scripts/build.mjs` — script de build de prod (front)
- `scripts/send-reminders.mjs` — CLI des rappels quotidiens, à appeler depuis la crontab système
- `server.js` — serveur Express (statique + API) pour le déploiement VPS
- `api/` — handlers API (auth, sync, push) + logique partagée dans `api/_lib/`
- `db/schema.sql` — schéma Postgres (Neon)

## Lancement

**Dev front seul :** ouvrir `index.html` directement dans un navigateur, ou `npm run dev` (serveur Vite sur `http://127.0.0.1:3000`, statique uniquement — pas d'API).

**Dev avec API (sync cloud/push) :** copier `config.example.js` en `config.js`, créer un `.env` avec au minimum `DATABASE_URL` (+ `JWT_SECRET`, VAPID, Resend si besoin de tester l'auth/les push), `npm run build` puis `npm start` — sert `dist/` et l'API sur `http://localhost:3000`.

**Déploiement VPS (production) :**
1. `git clone` le repo sur le VPS, `npm install`, `npm run build`.
2. Créer `.env` à la racine avec toutes les variables listées plus haut (ne jamais le committer).
3. `npm start` (lance `server.js`) — idéalement sous un gestionnaire de process qui redémarre en cas de crash et au reboot. Exemple avec `systemd` (`/etc/systemd/system/applika.service`) :
   ```ini
   [Unit]
   Description=App'lika
   After=network.target

   [Service]
   WorkingDirectory=/chemin/vers/applika
   ExecStart=/usr/bin/node server.js
   EnvironmentFile=/chemin/vers/applika/.env
   Restart=always
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```
   Puis `systemctl enable --now applika`. (`pm2` est une alternative si déjà en place sur le VPS.)
4. Mettre un reverse proxy (nginx, Caddy...) devant le port du serveur pour servir en **HTTPS** (obligatoire pour Web Push et pour que la PWA propose son installation) — Caddy gère le certificat Let's Encrypt automatiquement, nginx + `certbot` sinon.
5. Planifier les rappels quotidiens via la crontab système (`crontab -e`), **pas** via une requête HTTP :
   ```
   0 8 * * *  cd /chemin/vers/applika && node scripts/send-reminders.mjs >> logs/reminders.log 2>&1
   ```
