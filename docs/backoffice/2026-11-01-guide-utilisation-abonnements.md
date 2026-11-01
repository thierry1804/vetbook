# Guide d’utilisation — abonnements et demandes

Guide du 1er novembre 2026, correspondant aux lots 1 et 2 livrés. Le [document de suivi](2026-11-01-suivi-refonte-abonnements.md) contient les validations et les décisions d’exploitation.

La gestion porte sur les accès à l’application. Toute attribution ou prolongation reste une décision administrative manuelle. Aucun paiement ni renouvellement automatique n’est déclenché.

## 1. Où commencer

Dans le menu du backoffice, ouvrir **Abonnements** pour gérer les périodes, ou **Demandes** pour répondre aux utilisateurs. Depuis une fiche utilisateur, l’encart **Accès actuel** donne accès aux mêmes actions et au lien **Voir les périodes et l’historique**.

| Besoin | Point d’entrée |
|---|---|
| Accorder un premier accès | Abonnements → Attribuer un abonnement |
| Prolonger un accès | Détail de l’utilisateur → Renouveler |
| Remplacer une formule | Détail → Changer de formule |
| Examiner une demande | Demandes → À traiter → Traiter |
| Suivre les prochaines fins | Abonnements → Expirent bientôt |
| Vérifier les anciennes périodes | Abonnements → Rapport de reprise, avec permission avancée |

Les boutons visibles dépendent du rôle et de la situation du dossier. Une action absente peut nécessiter une autre permission ou être incompatible avec la période sélectionnée.

## 2. Comprendre ce qui est affiché

**Accès actuel** indique la formule effectivement accordée maintenant. **L’abonnement suivi** peut être expiré ou suspendu : son existence ne garantit pas un accès actif. Une **activation future** commence seulement à la date indiquée.

| État | Signification |
|---|---|
| Actif | Période commencée et encore valable. |
| Essai | Essai commencé et encore valable. |
| Prévu | Période à venir, sans droits anticipés. |
| Suspendu | Accès retiré temporairement ; la fin continue de courir. |
| Expiré | Date de fin atteinte. |
| Terminé | Période arrêtée manuellement. |
| Remplacé | Une autre période a pris le relais. |
| Annulé | Activation future annulée avant son démarrage. |
| À revoir | Statut historique nécessitant un examen. |

Sans période donnant accès, la formule de remplacement est **Gratuit**, avec les éventuels droits particuliers encore valables. Si l’application générale des formules est désactivée dans les réglages, les fonctionnalités restent ouvertes selon ce réglage ; les contrôles spécifiques de l’assistant IA restent appliqués.

Le détail permet aussi de consulter les droits particuliers et l’historique : auteur, date, motif et données avant/après. Un accès **sans échéance** reste valable sans date de fin tant qu’une décision ne le modifie pas.

## 3. Utiliser le formulaire commun

Toutes les actions passent par **Gérer l’abonnement**.

1. **Utilisateur** : rechercher un nom ou un e-mail avec au moins deux caractères. Depuis une fiche ou une demande, l’utilisateur est déjà renseigné.
2. **Action et durée** : vérifier l’action, la période concernée, l’offre et les dates selon le cas.
3. **Vérification** : saisir un **Motif de l’action** d’au moins cinq caractères, puis cliquer sur **Calculer l’aperçu**. Vérifier les périodes modifiées, le fuseau, les droits et quotas avant/après, les dépassements éventuels et les avertissements.
4. Cliquer sur le bouton **Confirmer…** correspondant à l’action. Le calcul de l’aperçu seul n’enregistre aucun changement.

Pour une opération programmée, regarder la date de comparaison des droits : elle correspond à la prise d’effet annoncée. Un dépassement de quota ne supprime pas les données existantes.

L’aperçu est valable au maximum cinq minutes, parfois moins si une transition connue arrive avant. Si le dossier change ou si l’aperçu expire, recalculer et vérifier à nouveau avant de confirmer. Les erreurs laissent le formulaire ouvert ; **Retour** permet de corriger les choix. Quitter un formulaire modifié demande une confirmation d’abandon.

Choisir un motif utile, par exemple : « Prolongation de deux mois validée avec la cliente » plutôt que « modification ».

## 4. Accorder une formule ou un essai

### Attribuer un abonnement

1. Ouvrir **Abonnements → Attribuer un abonnement**, puis choisir l’utilisateur.
2. Choisir **Attribuer**, l’**Offre** et la **Variante** disponible : mensuelle ou annuelle.
3. Indiquer le **Nombre de périodes standards**, de 1 à 10. Une période mensuelle correspond à un mois calendaire ; une période annuelle à douze mois.
4. Laisser le début vide pour commencer maintenant, ou choisir un début futur dans le fuseau affiché. Une **Durée personnalisée en jours** peut remplacer la durée standard ; expliquer ce choix dans le motif.
5. Calculer l’aperçu, vérifier la fin calculée et confirmer l’attribution.

Une formule archivée ne peut pas être attribuée. Une formule masquée au public peut rester proposée à l’administration. Si un accès existe déjà, utiliser **Renouveler** ou **Changer de formule** ; créer une période concurrente est refusé.

### Démarrer un essai

Choisir **Démarrer un essai** et une offre dont les jours d’essai sont configurés. Le formulaire affiche la durée et le nombre d’essais déjà accordés pour cette offre. La fin est obligatoire et calculée automatiquement.

Un second essai de la même offre de base, même avec une autre variante, nécessite une permission avancée et un **Motif de dérogation** distinct. Un essai ne démarre pas automatiquement à l’inscription et ne devient pas automatiquement un abonnement standard.

### Accorder un accès sans échéance

Cette option avancée exige la permission correspondante, la case **Accès sans échéance**, la confirmation explicite de l’absence de fin et un **Motif de dérogation** d’au moins cinq caractères, en plus du motif de l’action. L’utiliser seulement pour une exception décidée par l’équipe.

## 5. Renouveler ou changer de formule

### Renouveler la même offre

1. Ouvrir le détail et cliquer sur **Renouveler**.
2. Vérifier la période concernée et choisir le nombre de périodes supplémentaires.
3. Saisir le motif et calculer l’aperçu.
4. Comparer l’échéance actuelle et la nouvelle fin, puis **Confirmer le renouvellement**.

Si la période est encore valable, la prolongation part de sa fin : les jours restants sont conservés. Si elle est expirée, une nouvelle période commence maintenant ou à la date future explicitement choisie.

Exemple : une fin au 15 décembre prolongée d’un mois devient le 15 janvier, même si la décision est prise le 1er décembre. Les mois sont calendaires : un début le 31 janvier peut finir le 28 février, puis retrouver le 31 mars au renouvellement suivant.

Un accès sans échéance n’a pas de fin à prolonger. Un essai encore valable doit passer par **Changer de formule** pour être converti. Une période suspendue encore valable doit être reprise avant renouvellement. Si une activation future entre en conflit avec la prolongation, l’opération est refusée : examiner cette activation et décider explicitement de la conserver ou de l’annuler.

### Changer de formule

1. Choisir **Changer de formule**, la nouvelle offre et sa variante.
2. Choisir la **Prise d’effet** :
   - **Maintenant** : l’ancienne période s’arrête et la nouvelle commence pour la durée choisie. Les jours restants ne sont pas convertis automatiquement.
   - **À l’échéance actuelle** : les droits actuels restent valables jusqu’à leur fin, puis la nouvelle formule commence.
   - **Date future (avancé)** : une permission avancée et un motif de dérogation sont requis.
3. Vérifier les dates et les droits dans l’aperçu, puis confirmer le changement.

Pour un accès sans échéance, **À l’échéance actuelle** est indisponible. Choisir maintenant ou une date avancée explicite.

## 6. Suspendre, reprendre, terminer ou corriger

| Action | Mode d’emploi et conséquence |
|---|---|
| Suspendre | Choisir la période en cours, motiver, vérifier l’aperçu et confirmer. Le compte utilisateur reste actif ; la durée n’est pas gelée. |
| Reprendre | Choisir une période suspendue encore valable, motiver et confirmer. Une période expirée ne peut pas être reprise. |
| Mettre fin maintenant | Vérifier la période et le retour à l’accès de remplacement. S’il existe des activations futures, choisir explicitement de les conserver ou de les annuler. Confirmer après aperçu. |
| Annuler une activation prévue | Vérifier la période future sélectionnée, motiver et confirmer. Pour un changement programmé, l’annulation rétablit la fin précédente de la période remplacée, sous réserve de cohérence. |
| Corriger les dates | Avec la permission avancée, ouvrir **Corriger les dates**, vérifier la période, modifier début/fin et renseigner les deux motifs. Confirmer explicitement toute absence de fin. Les chevauchements restent contrôlés. |

La suspension de l’abonnement et la suspension du compte sont deux actions différentes. La fin d’un abonnement conserve les carnets et l’historique.

## 7. Traiter les demandes utilisateur

Ouvrir **Demandes**. L’onglet **À traiter** regroupe les demandes **Nouveau** et **En cours** ; les autres onglets permettent de consulter les demandes fermées.

### Accepter une demande

1. Rechercher l’utilisateur et lire l’offre, la variante, le commentaire et la date souhaitée.
2. Cliquer sur **Prendre en charge** pour devenir le responsable affiché. Cette action n’accorde aucun accès.
3. Cliquer sur **Traiter** pour ouvrir le formulaire commun, prérempli avec l’utilisateur et l’offre. Une demande de souscription sur un accès existant propose un changement de formule.
4. Vérifier les dates : la date souhaitée est une indication à examiner, pas une promesse d’activation.
5. Saisir le motif, calculer l’aperçu et confirmer l’opération correspondant à la demande.

La demande passe à **Traité** uniquement si l’opération réussit. Fermer le formulaire ou rencontrer une erreur ne la marque pas traitée. Ne pas accorder l’accès dans un formulaire indépendant si l’objectif est aussi de clôturer la demande : partir de **Traiter** pour conserver le lien.

### Refuser une demande

Cliquer sur **Refuser**, rédiger une **Réponse à l’utilisateur** d’au moins cinq caractères et, si nécessaire, une **Note interne**, puis **Confirmer le refus**. La réponse est visible dans l’application ; la note interne ne l’est pas. Le refus n’accorde aucun accès.

Si un autre administrateur modifie la demande ou si l’utilisateur l’annule entre-temps, actualiser la liste avant de reprendre la décision.

## 8. Côté utilisateur : demander et suivre

Dans l’application, se connecter puis ouvrir **Mon compte → Formule et abonnement**.

1. Consulter l’accès effectif, la période suivie, les dates, le temps restant, les activations futures et la dernière vérification. **Actualiser** recharge le suivi.
2. Cliquer sur **Demander cette formule** dans une offre, ou sur **Demander un renouvellement** lorsque ce bouton est proposé. Ces boutons préparent le formulaire **Faire une demande**.
3. Vérifier le type de demande et la variante. Ajouter éventuellement une date de début souhaitée future et un commentaire.
4. Cliquer sur **Envoyer la demande**. L’équipe doit l’examiner : l’envoi n’active pas immédiatement de droits.
5. Suivre l’état et la réponse dans **Mes demandes**. Une demande encore nouvelle ou en cours peut être annulée avec **Annuler la demande**.

Une demande ouverte identique est retrouvée au lieu d’être créée en double. Les coordonnées de contact restent disponibles dans la page. Une offre indisponible ou archivée peut être refusée au moment de l’envoi ; actualiser le catalogue.

Le renouvellement concerne une offre déjà détenue. Pour une autre variante ou une autre offre, choisir **Souscrire / changer de formule**. Un essai encore en cours se convertit par un changement de formule examiné par l’administration.

En cas de perte de réseau, consulter la dernière vérification. Après une transition connue, l’ancien cache ne garantit plus les droits : se reconnecter puis actualiser. Les données locales ne sont pas supprimées ; les exports restent disponibles dans **Mon compte → Données et confidentialité → Mes données**.

## 9. Organiser le suivi quotidien

Dans **Abonnements**, utiliser **En cours**, **Essais**, **Expirés**, **Suspendus**, **Prévus**, **Historique** ou **Tout**. La vue **Expirent bientôt** propose 3, 7 ou 30 jours. Les compteurs portent sur les périodes ; une même personne peut avoir une période actuelle et une activation future.

La recherche porte sur le nom ou l’e-mail. Le filtre d’offre complète la sélection. Les filtres et la pagination figurent dans l’URL : copier cette URL pour partager une vue avec un collègue autorisé.

**Enregistrer cette vue** conserve les filtres et les colonnes dans ce navigateur, pour le compte admin connecté. **Colonnes affichées** permet d’adapter le tableau. **Exporter CSV** exporte les périodes correspondant aux filtres, au-delà de la seule page affichée.

Routine conseillée : examiner **À traiter**, puis les échéances proches, les essais et les activations prévues. Le tableau de bord propose également des liens vers ces listes.

## 10. Notifications

L’application présente les notifications dans **Formule et abonnement → Notifications**. **Marquer comme lue** ne change pas l’abonnement.

Les opérations et les échéances peuvent produire une information dans l’application. Les rappels de fin utilisent des seuils de sept jours et d’un jour ; une nouvelle date de fin peut donner lieu à de nouveaux rappels. Les notifications de dates sont préparées périodiquement, environ chaque minute lorsque l’API fonctionne. Les droits changent à l’heure prévue même si ce traitement n’a pas tourné.

L’e-mail et le push nécessitent une configuration du service et des préférences utilisateur compatibles. Ne pas utiliser leur réception comme preuve d’activation : vérifier l’accès et les dates dans le dossier. Une livraison externe incertaine n’est pas rejouée automatiquement.

Les anciennes périodes conservées ne déclenchent pas d’envoi rétroactif massif. Les notifications automatiques de dates concernent les périodes créées ou modifiées par le nouveau parcours.

## 11. Permissions et réglages

| Permission | Usage | Rôles standards concernés |
|---|---|---|
| `subscriptions.read` | Consulter périodes, demandes et détails. | Super admin, admin technique, support, gestionnaire commercial. |
| `subscriptions.manage` | Attribuer, essayer, renouveler, changer de formule et traiter les demandes. | Super admin, support, gestionnaire commercial. |
| `subscriptions.control` | Suspendre, reprendre, terminer et annuler une activation future. | Super admin, support, gestionnaire commercial. |
| `subscriptions.advanced` | Rapport de reprise, corrections et dérogations. | Super admin par défaut. |

La gestion du catalogue des offres et celle des droits particuliers ont leurs propres permissions.

Dans les réglages de l’application du backoffice, section **Formules**, vérifier le **Fuseau de gestion des abonnements** avant les saisies. Le fuseau est affiché dans les formulaires ; les instants sont stockés en UTC. L’application utilisateur affiche les dates dans le fuseau de son appareil. Une fin est exclusive : à l’heure de fin indiquée, la période cesse de donner accès et une éventuelle période suivante commence.

## 12. Résoudre les blocages courants

| Message ou situation | Que faire |
|---|---|
| Aperçu expiré ou dossier modifié | Vérifier les données rechargées, recalculer l’aperçu et confirmer après nouvelle lecture. |
| Chevauchement de périodes | Examiner les périodes futures ; annuler explicitement une programmation devenue inutile ou demander une correction avancée. |
| Dossier nécessitant une revue | Un super admin consulte le **Rapport de reprise** et le détail, puis décide de la correction. Aucune correction automatique n’est appliquée. |
| Abonnement historique sans échéance | Le conserver si c’est la décision souhaitée. Pour fixer une fin, utiliser une correction avancée motivée ; **Renouveler** n’est pas adapté. |
| Ancien statut « en retard » | Faire examiner le dossier ; une reprise nécessite une permission avancée et un motif de dérogation. |
| Demande déjà fermée ou modifiée | Actualiser et vérifier si elle a été traitée, refusée ou annulée. |
| Renouvellement d’un essai en cours refusé | Utiliser le changement de formule ; si la demande ouverte ne correspond plus à cette opération, expliquer le refus et demander une demande adaptée. |
| Offre archivée | Choisir une offre disponible et examiner un changement ou une nouvelle attribution. |
| Bouton absent ou accès refusé | Vérifier les permissions avec un super admin et l’état de la période. |
| Abonnement confirmé mais affichage utilisateur ancien | Cliquer sur **Actualiser** dans l’application, vérifier le réseau, les dates de début et les éventuelles suspensions. |
| Notification externe absente | Vérifier d’abord le dossier et l’historique dans l’application ; faire contrôler la configuration et les préférences de notification. |

Pour les détails techniques et les validations, consulter le [suivi de livraison](2026-11-01-suivi-refonte-abonnements.md). Les anciens écrans d’écriture directe ne doivent plus être utilisés : toutes les décisions passent par le formulaire avec aperçu et confirmation.
