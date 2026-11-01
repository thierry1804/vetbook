# Améliorations UX du front — 1er novembre 2026

Suite de l’[audit UX](2026-11-01-audit-ux-front.md). Les six points sont traités dans l’application utilisateur et, pour le support, dans le backoffice.

## Parcours de demande de formule

Dans **Compte → Formule et abonnement**, les tarifs et avantages restent comparables. Le dialogue affiche désormais « Étape 1 sur 3 » à « Étape 3 sur 3 ». À chaque changement d’étape, le focus arrive sur le nouveau titre. L’étape 2 s’appelle **Modalités de la demande** et contient une date souhaitée et un message facultatifs. Elle n’affiche plus une liste d’opérateurs non vérifiée. La confirmation précise qu’envoyer la demande n’active pas la formule et ne déclenche aucun paiement automatique.

Le suivi **Mes demandes** montre l’état et la date de dernière mise à jour. Le texte « réponse sous 24 h » a été retiré de l’interface tant qu’aucun délai de service vérifié n’est configuré. Les réponses et décisions administratives restent manuelles. Le champ de référence de paiement du backoffice reste celui de l’opération administrative ; l’utilisateur peut fournir une information utile dans son message.

## Compte sur grand écran

Le plafond de largeur de 1 040 px a été retiré du conteneur Compte. La navigation latérale et le panneau s’étendent dans l’espace disponible. Les textes d’aide gardent leurs limites de longueur locales et les cartes d’abonnement conservent leur grille adaptable.

## Support intégré

**Signaler un problème** dans Compte ou **Contacter le support** dans le Centre d’aide ouvre un formulaire avec e-mail, sujet et description. Le serveur valide les longueurs et limite les envois à trois par adresse IP et par quart d’heure. Après un enregistrement réussi, le formulaire affiche le numéro de la demande. Un échec laisse les champs ouverts. Aucune connexion GitHub ni compte App’lika ne sont nécessaires.

Les demandes sont conservées dans `support_requests`. Les administrateurs ayant `users.support` les voient dans **Support** en temps réel et peuvent passer l’état de **Nouveau** à **En cours** puis **Traité**. Ils répondent dans le backoffice. Si l’adresse correspond à un seul compte, la demande y est rattachée : la réponse apparaît dans **Compte → Aide → Mes demandes de support** et déclenche une notification en temps réel. Sans compte correspondant, aucune réponse n’est envoyée. Le tableau affiche les 200 demandes les plus récentes ; les plus anciennes restent en base et nécessitent une consultation technique pour l’instant.

## Aide éditoriale

Les questions fréquentes et les guides viennent désormais des pages `kind=help` publiées dans le backoffice, lues par `/api/help`. Six réponses initiales sont créées de manière idempotente : connexion, sauvegarde, rappels, notifications, abonnements et export. Les modifier dans **Contenus → Pages**, puis publier une nouvelle version. La page prend la dernière version publiée de chaque slug. Le dernier contenu publié déjà chargé par l’application reste affiché si le réseau échoue ; sinon un message d’indisponibilité et le formulaire de support sont proposés.

## Vérification et exploitation

- Vérifier au clavier les trois étapes de demande et leur focus, puis les annonces avec un lecteur d’écran lors d’une revue d’accessibilité dédiée.
- Vérifier Compte et Formule à 390, 1 280, 1 440 et 2 560 px après déploiement.
- Envoyer une demande de support de démonstration dans un environnement isolé ; vérifier sa présence dans **Support** et la notification d’un admin autorisé. Ne pas créer de faux tickets en production.
- Relire périodiquement les six pages d’aide depuis le backoffice après tout changement de parcours.

L’audit au lecteur d’écran et les entretiens utilisateurs ne font pas partie de cette livraison ; ils restent utiles pour confirmer l’effet des changements.
