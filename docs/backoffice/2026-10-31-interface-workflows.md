# Backoffice — améliorations des parcours (31 octobre 2026)

Les écrans gardent toute la largeur disponible, avec des colonnes adaptées aux fiches et des tableaux à défilement horizontal sur les petits écrans.

## Livré

- Tableau de bord : file « À traiter » avec quantités réelles et accès aux listes filtrées. Les rubriques sont autorisées côté serveur selon les permissions. Les échecs couvrent les sept derniers jours, les abonnements les sept jours à venir.
- Listes : choix des colonnes, nombre de résultats et vues nommées conservant URL, filtres, tri, pagination et colonnes. Préférences locales au navigateur, séparées par identifiant administrateur et tableau. Suppression et restauration des colonnes disponibles. Les ressources, utilisateurs et journaux gardent leurs filtres dans l’URL.
- Fiches : sections, résumé et historique des 50 dernières actions pour les administrateurs autorisés à consulter l’audit. Aperçu et historique accompagnent les formulaires sur grand écran.
- Publication : comparaison du contenu figé avec la version actuellement publiée, par entrée et rubrique (ajout, modification, suppression), avec valeurs avant/après. Par défaut, l’auteur peut publier sa propre version après revue (deux yeux). Le réglage « exiger un second administrateur » permet de rétablir les quatre yeux. La publication depuis la revue refuse une référence devenue obsolète ; les publications sont sérialisées en base.
- Réglages : recherche par section et vocabulaire métier, navigation, indicateurs de modification et récapitulatif avant confirmation. La section Formules conserve sa confirmation distincte.
- Notifications : filtres de canal, statut, période et exécution ; fiche d’exécution et liens vers ses tentatives. Les anciens historiques restent explicitement sans métriques par canal.
- Formulaires : indication des champs modifiés, sauvegarde en restant sur la fiche, résumé des erreurs avec accès au champ concerné et protection des modifications non enregistrées.

## Compteurs et exécution des rappels

`job_runs.sent` reste le nombre historique de traitements comptabilisés, pas un nombre de personnes ayant reçu une notification. Pour les nouvelles exécutions, `details.delivery` sépare les e-mails acceptés par SMTP, simulés et échoués, ainsi que les push acceptés, échoués et expirés. Une acceptation ne confirme ni réception ni lecture.

`message_log.job_run_id` relie les tentatives aux nouvelles exécutions. Les tentatives push sont journalisées sans endpoint ni clés de souscription. Sans clés VAPID, les e-mails restent traités et la fiche indique que les push ne sont pas configurés.

Le cron et le lancement manuel utilisent `executeReminderJob` : verrou commun PostgreSQL, audit manuel avant tout envoi et statut `partial` en cas d’échec d’un canal. Un problème de suivi après les envois est signalé sans annoncer à tort que les envois n’ont pas eu lieu.

## Validation et mise en service

- Vérification TypeScript et compilation de l’administration.
- Lint des modules backend modifiés.
- `npm run test:admin-workflow --prefix backend` : 8 tests de comparaison, filtres, verrouillage et suivi des exécutions.
- `backend/tests/admin-operations.integration.mjs` : exige une base jetable nommée `applika_qa`, sans SMTP ni VAPID. Vérifie migration idempotente, permissions, listes filtrées, historique, publication et envois simulés.
- Suite existante `backend/scripts/smoke-admin.mjs` : 23 contrôles de régression sur une base isolée.
- Vérifications Chromium sur API simulée : vues et colonnes persistées, sauvegarde sur place, revue de publication, réglages, journal lié et affichage sur 12 écrans aux largeurs 390, 768, 1440 et 2560 pixels. Les scénarios d’erreur de validation et de refus d’enregistrement conservent aussi les valeurs saisies.

La migration additive de `backend/db/admin.sql` est appliquée par `ensureSchema` au démarrage. Pour mettre ces modifications en service, reconstruire ensemble les images API et Nginx ; un simple redémarrage d’images anciennes ne suffit pas.
