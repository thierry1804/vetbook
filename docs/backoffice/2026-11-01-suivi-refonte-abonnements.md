# Suivi — gestion des abonnements, lots 1 et 2

Référence : [proposition fonctionnelle](2026-11-01-proposition-gestion-abonnements.md).

Mode d’emploi : [guide d’utilisation des abonnements et demandes](2026-11-01-guide-utilisation-abonnements.md).

Périmètre : gestion des accès uniquement, décisions administratives manuelles, aucun paiement ajouté. Les tests d’écriture utilisent une base jetable ; les données métier réelles ne servent pas de jeu de test.

| Lot | État | Livrable attendu |
|---|---|---|
| 1A — Cohérence | Réalisé | Rapport de reprise, calcul partagé, dates calendaires, permissions, aperçu et opérations atomiques/idempotentes. |
| 1B — Administration | Réalisé | Liste et détail dédiés, formulaires communs à la fiche utilisateur, fermeture des écritures brutes. |
| 1C — Application | Réalisé | Accès effectif, échéance, prochaines transitions et cache borné. |
| 2 — Demandes | Réalisé | Demandes utilisateur, file administrative, attribution liée et refus motivé. |
| 2 — Notifications | Réalisé | Historique dans l’application et notifications d’activation/échéance sans doublons. |
| Validation | Réalisée | Tests unitaires, API isolée, parcours navigateur, compilation, reprise et contrôles de déploiement. |

## Décisions et observations

- Aucun abonnement existant ne sera résilié ou réactivé automatiquement lors de la migration.
- Les anomalies de reprise seront présentées à l’administrateur ; les cas nécessitant une décision explicite resteront signalés.
- Les dates sont enregistrées en UTC et affichées dans le fuseau de gestion de l’instance.
- Les résultats de validation et les décisions d’exploitation sont consignés ci-dessous.

## Validation intermédiaire

- Reprise en lecture seule : 4 périodes existantes, dont 3 sans échéance ; aucune date future, date inversée, période concurrente active ni statut inconnu détecté. Les accès sans échéance restent inchangés et signalés pour revue.
- 23 vérifications de régression admin réussies ; les anciens tests d’écriture passent désormais par l’aperçu et la confirmation métier. L’ancienne route d’attribution retourne explicitement 410.
- 18 scénarios métier réussis sur PostgreSQL jetable : calendrier, transitions, idempotence concurrente, aperçu périmé, signature, permissions, renouvellement, changement programmé, suspension/reprise, demandes et notifications.
- 8 tests unitaires de régression réussis. TypeScript et lint des nouveaux modules passent.
- Les compilations admin et application passent. Les vérifications navigateur et le déploiement Docker sont terminés.

## Fonctionnalités réalisées

- **1A** : migration additive et rapport `/subscription-review` en lecture seule ; calcul commun des périodes effectives, suivies et futures ; UTC et fuseau configurable ; mois calendaires avec jour d’ancrage ; permissions dédiées. Aperçus signés de cinq minutes au maximum, invalidés par changement du dossier ou transition connue ; confirmation sous verrou utilisateur, contrôle de version et identifiant d’opération idempotent ; historique et audit dans la même transaction.
- **1B** : liste et compteurs par état, recherche, filtre d’offre, échéances à 3/7/30 jours, export CSV, colonnes et vues enregistrées. Détail, encart dans la fiche utilisateur et formulaire commun à trois étapes : attribution, essai, renouvellement, changement immédiat ou programmé, suspension/reprise, fin, annulation future et correction avancée. Aperçu des dates, droits, quotas et dépassements ; avertissement avant abandon d’un brouillon. Les écritures génériques et l’ancienne attribution sont fermées côté serveur.
- **1C** : formule effective et abonnement suivi, dates, temps restant, prochaine activation, dernière vérification et actualisation manuelle. Rechargement des droits à l’ouverture, au premier plan, au retour du réseau et à la transition connue ; cache borné par l’échéance, les activations et les dérogations. L’expiration ne supprime aucun carnet ; la récupération personnelle et les exports restent accessibles.
- **2 — Demandes** : offre et variante, date souhaitée et commentaire ; demandes ouvertes dédupliquées, suivi et annulation par leur propriétaire. File admin avec recherche, états, responsable, prise en charge et refus motivé. Formulaire métier prérempli depuis la demande ; passage à « traité » uniquement avec l’opération réussie, dans la même transaction. Les notes internes restent exclues de l’API utilisateur.
- **2 — Notifications** : historique dans l’application, marquage comme lu, opérations, activation et rappels à 7 jours/1 jour, expiration. Clés uniques de déduplication, traitement périodique avec verrou ; e-mail et push seulement si configurés et autorisés. Une livraison dont le résultat est incertain n’est pas rejouée automatiquement. Le calcul des droits fonctionne sans cette tâche.

## Vérifications finales

- 23 contrôles de fumée admin, 8 tests unitaires de régression et **18 scénarios abonnements** réussis sur base PostgreSQL jetable.
- Les scénarios abonnements couvrent notamment janvier 31 → février 28 → mars 31, février 29, changement d’heure, frontières début inclus/fin exclue, démarrage futur, renouvellement conservant les jours restants, signatures et aperçus périmés, confirmations identiques ou différentes en concurrence, permissions, dérogations, changement programmé et annulation, suspension indépendante du compte, anciennes écritures fermées, confidentialité/traitement des demandes et conservation/récupération des carnets après fin d’accès.
- Notifications testées avec fournisseur injecté : aucun appel quand les canaux ne sont pas configurés ; e-mail autorisé envoyé une seule fois ; historique dédupliqué. Aucun message réel n’a été envoyé par les tests.
- Navigateur avec données simulées : aperçu sans écriture, confirmation, traitement depuis une demande, profil en lecture seule ; côté utilisateur, demande annuelle et notification. Absence de débordement de page aux largeurs **390, 768, 1440 et 2560 px** ; captures vérifiées.
- TypeScript, lint des modules concernés, compilations admin/application et contrôle des espaces Git réussis. Le lint global de `frontend/app.js` conserve deux erreurs préexistantes de fonctions inutilisées (`centraleCanineBreedSlug`, `centraleCanineBreedUrl`), hors de cette refonte.

Pour rejouer les tests métier : `npm run test:subscriptions --prefix backend`, avec `DATABASE_URL` dirigée exclusivement vers une base de test et `JWT_SECRET` de test. La suite crée des comptes et des périodes : ne pas la lancer sur la base métier.

## Exploitation et décisions conservées

- Les trois accès historiques sans échéance nécessitent seulement une décision métier si l’équipe souhaite leur fixer une fin. La refonte ne les convertit pas automatiquement.
- Les notifications automatiques de dates concernent les périodes créées ou modifiées par le nouveau parcours. Pas d’envoi rétroactif massif sur les anciennes périodes conservées.
- Les canaux externes restent tributaires de la configuration SMTP/VAPID et des préférences ; aucune vérification de livraison réelle n’a été effectuée. L’historique dans l’application fonctionne indépendamment.
- La liste et la file calculent les états avant pagination côté serveur. Une optimisation SQL pourra être utile si le volume augmente fortement ; aucun changement de comportement n’est nécessaire pour les données actuelles.
- Aucun paiement, prestataire, montant à saisir, encaissement automatique ou statut financier ajouté. Les historiques existants restent conservés.

## Livraison

- Déploiement le 1er novembre 2026 : reconstruction de l’API et de Nginx (application et backoffice), services sains.
- Contrôles en lecture seule : API `/api/health` à 200, réponse positive via le proxy Nginx et page du backoffice accessible.
- Après migration : **4 périodes**, **3 sans échéance**, **4 périodes historiques conservées avec `workflow_version=0`**. Aucun accès métier réel modifié par les tests ou la migration.
- Lots 1A, 1B, 1C et 2 réalisés. Aucun développement de paiement inclus. Les décisions métier et limites d’exploitation figurent ci-dessus.
