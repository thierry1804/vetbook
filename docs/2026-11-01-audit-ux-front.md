# Audit UX du front utilisateur — 1er novembre 2026

## Périmètre et méthode

Revue statique de `frontend/index.html`, `frontend/app.js`, `frontend/account.js`, `frontend/styles.css` et du guide des abonnements. Les constats ci-dessous décrivent le code au commit `5cf2eb4`. Aucun entretien utilisateur, relevé de trafic ou audit complet au lecteur d’écran n’a été réalisé ; les effets sur les utilisateurs sont donc des hypothèses à valider quand ils ne découlent pas directement du code.

Les skills disponibles ont été examinés : aucun skill dédié à l’audit UX d’une application existante n’est fourni. `sites:sites` concerne les sites créés avec Sites ; ce front est maintenu dans ce dépôt. `imagegen` concerne les images bitmap et n’apporterait pas de preuve utile à cette revue. La méthode retenue est l’inspection des parcours et de leurs états dans le code.

## Ce qui fonctionne déjà

- Navigation principale nommée, boutons explicites et accès rapide aux urgences dans l’en-tête (`frontend/index.html:20-55`).
- Compte organisé en sections avec navigation latérale sur grand écran et vue dédiée sur mobile (`frontend/account.js:320-350`, `frontend/styles.css:8585-8611`).
- Dialogues du compte avec retour du focus, fermeture par Échap et maintien du focus au clavier (`frontend/account.js:198-226`).
- Préférences de contraste et de réduction des animations, et styles de focus visibles dans plusieurs composants (`frontend/styles.css:8615-8628`).
- Suivi des demandes et notifications dans l’application ; les accès restent gérés manuellement (`docs/backoffice/2026-11-01-guide-utilisation-abonnements.md`).

## Améliorations prioritaires

| Priorité | Constat et preuve | Effet probable | Changement proposé et critère de validation |
|---|---|---|---|
| P1 | Le dialogue de demande affiche une étape « Paiement » et trois opérateurs fixes, même lorsque les consignes de paiement ne sont pas configurées (`frontend/account.js:815-822`). Le même champ reçoit « référence de paiement ou commentaire ». | L’utilisateur peut croire que ces moyens sont acceptés et qu’un paiement est attendu avant toute demande. Le support ne peut pas distinguer clairement une référence d’une question. | Renommer l’étape « Modalités de la demande » ; afficher seulement les instructions réellement configurées ; séparer « Référence de paiement » et « Message » si une référence doit être collectée, sinon n’afficher que « Message ». La confirmation explique explicitement que l’envoi n’active pas l’offre. Aucun paiement automatique n’est ajouté. |
| P1 | « Réponse sous 24 h » apparaît dans le suivi, la confirmation et le toast (`frontend/account.js:677`, `:826`, `:841`) sans mécanisme de délai visible dans le parcours. | Une promesse non tenue réduit la confiance et crée des relances inutiles. | Utiliser un délai administrable et publié, ou une formulation sans délai garanti. Afficher l’état « Nouveau / En cours / Traité / Refusé » et la date de dernière mise à jour. Valider le texte avec l’équipe qui traite les demandes. |
| P1 | Le passage entre les trois étapes remplace entièrement le contenu du dialogue par `innerHTML` (`frontend/account.js:831-838`). Les indicateurs d’étape sont masqués aux technologies d’assistance (`:801`). | Après « Continuer » ou « Retour », le focus peut se retrouver hors du contenu remplacé ; un lecteur d’écran ne reçoit pas le nouvel intitulé ni l’avancement. | Mettre le focus sur le titre de chaque étape après le rendu, annoncer « Étape 2 sur 3 », et conserver un retour clavier stable. Vérifier le parcours complet au clavier et au lecteur d’écran. |
| P2 | La page Compte reste limitée à 1 040 px malgré les écrans larges (`frontend/styles.css:8411`). | Les cartes de formule et les panneaux occupent peu de place sur bureau, contrairement à la largeur demandée pour les interfaces. | Retirer le plafond global et définir des largeurs lisibles au niveau des seuls blocs de texte ou formulaires. Vérifier les pages Compte et Formule à 1 280, 1 440 et 2 560 px, sans lignes de texte trop longues ni cartes démesurées. |
| P2 | « Signaler un problème » mène à GitHub à la fois dans l’aide et dans le compte (`frontend/index.html:193-195`, `frontend/account.js:930`). | Une personne sans compte GitHub quitte l’application pour demander de l’aide. | Fournir un contact de support configuré et accessible depuis les deux entrées, avec sujet, description et confirmation d’envoi. Garder GitHub comme canal technique secondaire si souhaité. Vérifier qu’une personne sans compte GitHub peut signaler un problème. |
| P2 | La FAQ est écrite en dur dans la page (`frontend/index.html:165-195`) tandis que des contenus d’aide CMS sont chargés à côté (`:160-162`). | Les réponses peuvent diverger du parcours et nécessitent un déploiement pour être corrigées. | Définir une source éditoriale unique, avec responsable et date de révision ; relier les réponses aux écrans concernés. Vérifier les instructions sur connexion, sauvegarde, notifications et abonnements après chaque changement de ces parcours. |

## Ordre de réalisation suggéré

1. Corriger les textes et les champs du dialogue de demande, après validation des consignes et délais réels par l’équipe.
2. Corriger le focus et l’annonce des étapes du dialogue ; faire une vérification clavier et lecteur d’écran.
3. Étendre la largeur de Compte et contrôler les cas avec textes longs et cartes d’abonnement.
4. Créer un canal de support accessible à tous et consolider la FAQ.

## Vérifications de résultat

- Une personne peut comparer les offres, envoyer une demande et retrouver son état sans supposer que l’accès est activé ni qu’un paiement automatique a eu lieu.
- Le parcours est faisable sans souris ; le focus et l’étape courante restent perceptibles à chaque transition.
- Sur mobile à 390 px, aucun débordement horizontal ; sur grand écran, les cartes utilisent l’espace disponible et les textes restent lisibles.
- Une personne sans compte GitHub peut demander de l’aide.

Ce document propose des travaux ; il ne modifie pas l’interface ni le traitement des demandes.
