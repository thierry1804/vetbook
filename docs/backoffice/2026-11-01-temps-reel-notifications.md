# Temps réel et notifications — utilisation et exploitation

Ce complément étend les [abonnements et demandes](2026-11-01-guide-utilisation-abonnements.md) au backoffice et à l’application utilisateur. Les décisions d’accès restent manuelles ; aucun paiement ajouté.

## Ce qui se met à jour

| Événement | Administrateurs autorisés | Utilisateur concerné |
|---|---|---|
| Nouvelle demande | Notification, compteur et file des demandes. | Confirmation de réception dans sa cloche. |
| Prise en charge | Responsable et état dans la file. | Notification de prise en charge, état actualisé. |
| Attribution, renouvellement, changement, suspension, reprise ou fin | Dossier, listes, tâches et tableau de bord actualisés ; notification aux autres admins autorisés. | Notification, suivi et droits actualisés. |
| Refus | État et file actualisés. | Réponse publique dans les notifications et le suivi. |
| Annulation par l’utilisateur | Notification et file actualisée. | État actualisé. |
| Échéance proche ou dépassée | Notification liée au dossier. | Rappel ou information dans les notifications. |
| Lecture d’une notification | Compteur personnel actualisé sur les autres fenêtres connectées. | Même fonctionnement entre ses propres fenêtres. |

Les événements sont adressés au compte concerné. Les notifications d’abonnement admin nécessitent toujours la permission de consultation des abonnements. Les notes internes ne sont pas transmises aux utilisateurs. Un admin ne reçoit pas de notification pour la décision d’abonnement qu’il vient lui-même d’enregistrer ; les autres admins autorisés peuvent la recevoir.

## Utiliser la cloche

**Backoffice** : cloche dans la barre supérieure, à côté des commandes générales. **Application** : cloche dans l’en-tête, près du bouton du compte, après connexion.

La pastille indique le nombre de non-lus. Ouvrir la cloche pour consulter les notifications, filtrer les non-lues, parcourir les pages et ouvrir le dossier ou la page concernée.

- **Marquer comme lue** concerne uniquement son propre compte.
- **Tout marquer comme lu** porte sur les notifications antérieures à la dernière vérification affichée par le serveur ; les nouvelles arrivées restent non lues.
- **Ouvrir** marque la notification comme lue et mène à son dossier.
- Lire une notification ne prend pas en charge une demande et ne la marque pas traitée.

Le tableau de bord, la file et les dossiers d’abonnement se rechargent en arrière-plan. Le commentaire utilisateur et les champs du formulaire admin restent conservés lorsqu’un événement arrive. Une décision concurrente peut toujours rendre un aperçu obsolète : il faut alors vérifier un nouvel aperçu avant de confirmer.

Les demandes déjà ouvertes au déploiement sont ajoutées à la boîte des admins autorisés, avec déduplication. Les notifications utilisateur d’abonnement déjà présentes sont reprises avec leur état lu/non lu ; elles ne déclenchent pas un nouvel envoi push de reprise.

## Recevoir une notification lorsque l’application est fermée

Dans la cloche, choisir **Activer les notifications sur cet appareil**, puis accepter la permission du navigateur. L’activation est propre au navigateur et à l’appareil. Le compte doit disposer d’un abonnement push enregistré ; le serveur doit avoir ses clés VAPID configurées.

La désactivation sur cet appareil retire son abonnement push. Côté utilisateur, les préférences de notifications et les heures silencieuses sont prises en compte. L’activation explicite autorise aussi le push dans ses préférences. Les réglages globaux de rappel et l’éligibilité aux rappels métier restent séparés du simple accès à la boîte de notifications.

Si le push n’est pas configuré ou pas pris en charge par le navigateur, un message l’indique. La cloche et le temps réel continuent de fonctionner. La réception hors application dépend du navigateur et du système ; elle n’est pas garantie à la seconde. Sur les appareils imposant l’installation de la PWA pour le push, utiliser l’application installée et autoriser les notifications.

Un clic sur une notification externe ouvre la page concernée, y compris lorsqu’une fenêtre existe déjà. Une notification ne sert jamais de preuve de droits : ceux-ci sont recalculés par le serveur.

## Connexion et interruptions

Avec un écran ouvert, un flux SSE transmet les changements après leur validation en base. La connexion est rétablie automatiquement après une coupure. Les événements manqués sont récupérés à partir du dernier identifiant reçu ; la liste et les compteurs sont également rechargés à la reconnexion.

Si le flux est indisponible, une vérification périodique toutes les 30 secondes maintient le suivi. Le statut de connexion est affiché dans la cloche. Le retour au premier plan ou au réseau provoque aussi une actualisation.

La fermeture de la session arrête le flux. Les sessions et permissions sont recontrôlées avant les lots d’événements et à intervalles réguliers ; une révocation sans autre activité est détectée au prochain contrôle, normalement sous 15 secondes.

## Architecture et configuration

- `realtime_events` conserve les signaux de changement pendant sept jours, sans copie des notes, du contenu des carnets ou des jetons de session. Un curseur trop ancien impose une récupération de l’état courant.
- `inbox_notifications` conserve les messages et leur état de lecture par destinataire. L’historique d’abonnement existant et la boîte globale partagent la lecture des notifications d’abonnement.
- Les changements et les notifications sont inscrits dans la transaction métier par des déclencheurs PostgreSQL. Un rollback ne publie rien.
- `LISTEN/NOTIFY` réveille les instances API ; PostgreSQL reste la source des événements durables. Une connexion PostgreSQL dédiée par instance sert à l’écoute.
- Un verrou transactionnel commun ordonne les identifiants jusqu’au commit afin d’éviter qu’une transaction concurrente fasse sauter un événement lors de la reprise. Ce choix privilégie la cohérence ; il sera à réévaluer pour un très gros débit d’écriture.
- Les API utilisent les cookies utilisateur/admin existants. Aucun jeton n’est placé dans l’URL SSE. Nginx laisse passer le flux sans mise en tampon ; un heartbeat évite les connexions silencieuses.
- Limites actuelles : cinq flux simultanés par compte et catégorie, cinq cents par instance API. Au-delà, le client conserve sa vérification périodique.

Les notifications d’échéance et l’envoi externe sont examinés toutes les cinq secondes environ lorsque l’API fonctionne. Les échéances de droits ne dépendent pas de ce traitement. Un traitement différé peut produire un rappel avec retard ; la date de validité reste déterminante.

Le push utilise `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et éventuellement `VAPID_SUBJECT`, déjà employés par les notifications utilisateur. La clé privée reste côté serveur ; seule la clé publique est communiquée aux interfaces. Le backoffice utilise un service worker dédié, `admin-sw.js`, sur son propre hôte.

Les envois push portent un identifiant de notification. Un résultat incertain est conservé comme tel et n’est pas rejoué automatiquement. Les abonnements expirés signalés par le fournisseur sont retirés. Les notifications en boîte restent consultables même si l’envoi externe échoue. Les e-mails d’abonnement existants sont conservés ; cette extension n’ajoute pas de nouvel envoi e-mail admin.

## Vérifications et diagnostic

Les tests d’écriture doivent utiliser une base jetable :

- `npm run test:realtime --prefix backend` : authentification, destinataires, permissions, transactions annulées, reprise SSE, ordre concurrent, lecture partagée et push simulé.
- `npm run test:subscriptions --prefix backend` : régression du processus d’abonnement.

Dans les outils réseau du navigateur, `/api/admin/events` ou `/api/me/events` doit rester ouvert avec le type `text/event-stream`. Les messages `ready`, `change`, `cursor` et les heartbeats confirment l’activité. Un refus 401 impose une reconnexion ; un refus 429 signale la limite de flux.

Pour une cloche vide, vérifier d’abord le compte connecté, ses permissions et le filtre des non-lues. Pour un push absent, vérifier la permission du navigateur, l’activation sur cet appareil, les préférences, la configuration VAPID et l’état d’envoi enregistré ; ne pas créer une seconde décision d’abonnement pour tenter de renvoyer une notification.
