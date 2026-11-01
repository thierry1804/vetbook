# Abonnements — fonctionnement actuel et difficultés

État constaté le 1er novembre 2026 à partir du code et des réglages de l’instance. Ce document décrit le fonctionnement existant, avant une éventuelle refonte.

La gestion est manuelle. **L’attribution d’un abonnement et l’enregistrement d’un paiement sont deux opérations indépendantes.**

## 1. Configuration des offres

Dans **Offres → Formules**, l’administration configure les prix, les variantes mensuelles et annuelles, les jours d’essai annoncés et la visibilité des formules.

La **Matrice des droits** définit séparément les fonctionnalités et les quotas de chaque variante.

Sur l’instance au moment du constat :

- `subscriptions_enforced = true` : les restrictions des formules sont appliquées.
- `gated_ui = hide` : les fonctionnalités non incluses sont masquées dans l’application.

Ces réglages sont modifiables dans le backoffice ; les valeurs ci-dessus ne constituent pas une règle permanente.

## 2. Consultation et prise de contact par le client

Dans **Compte → Formule et abonnement**, le client voit sa formule, les offres disponibles et les instructions de souscription.

Il peut contacter l’équipe par WhatsApp, téléphone ou e-mail, selon les coordonnées configurées.

Ce parcours ne crée ni commande ni demande de souscription à traiter dans le backoffice. Il ne comporte pas de paiement intégré.

Source : [frontend/account.js](../../frontend/account.js), fonction `panelPlan`.

## 3. Attribution depuis la fiche utilisateur

L’administrateur ouvre une fiche utilisateur et clique sur **Attribuer une formule**. Il renseigne :

- La variante exacte de la formule : mensuelle ou annuelle.
- Le statut proposé : essai, actif, en retard ou suspendu.
- Une date de fin facultative.
- Un motif journalisé.

L’API résilie les anciens abonnements de cet utilisateur au statut `actif` ou `essai`, puis crée un nouvel abonnement, dans une transaction.

**La durée n’est pas calculée automatiquement depuis la période de facturation.** Sans date de fin, l’abonnement n’a pas d’échéance. Les jours d’essai configurés dans une formule ne déclenchent pas automatiquement un essai ni son échéance.

Sources : [admin/src/Users.tsx](../../admin/src/Users.tsx), [backend/api/admin/router.js](../../backend/api/admin/router.js), route `POST /users/:id/subscription`.

## 4. Saisie séparée du paiement

Depuis la fiche utilisateur, l’action **Enregistrer un paiement** demande :

- Un montant en ariary, entier et strictement positif.
- Un moyen : MVola, Orange Money, Airtel Money, carte ou espèces.
- Une référence de transaction facultative.
- Un motif journalisé.

L’action crée un paiement au statut `confirme` et une facture numérotée de la forme `F-AAAA-000001`. Ces éléments sont consultables dans **Facturation → Paiements / Factures**.

**Enregistrer un paiement n’active pas l’abonnement et ne prolonge pas sa date de fin.** Le montant saisi n’est pas automatiquement rapproché du tarif de la formule. La facture est un enregistrement en base ; ce parcours ne génère ni PDF ni envoi automatique.

Exemple : saisir un paiement pour un abonnement expiré ne rétablit pas ses droits. Il faut également modifier sa validité ou attribuer un nouvel abonnement.

Source : [backend/api/admin/router.js](../../backend/api/admin/router.js), route `POST /subscriptions/:id/payments`.

## 5. Calcul des droits et actualisation dans l’application

Le serveur retient le dernier abonnement, selon sa date de début, qui remplit ces conditions :

- Son statut est `actif` ou `essai`.
- Sa date de fin est future ou absente.

En l’absence d’un tel abonnement, la formule effective est **Gratuit**. Les fonctionnalités et quotas de cette formule sont alors utilisés lorsque l’application des formules est activée. Les dérogations de **Droits accordés** peuvent modifier individuellement certains accès ou quotas, avec une date d’expiration facultative.

L’assistant IA possède un contrôle spécifique qui applique ses droits même lorsque l’interrupteur général des formules est désactivé.

L’application recharge les droits au démarrage d’une session connectée, à la connexion ou lors d’une actualisation manuelle. Une modification administrative n’est pas répercutée en temps réel dans un écran déjà ouvert. Un cache des droits est aussi conservé pour l’utilisation hors ligne, avec une validité de sept jours ; les contrôles serveur continuent de recalculer les droits pour les opérations protégées.

Sources : [backend/api/_lib/entitlements.js](../../backend/api/_lib/entitlements.js), [backend/api/me/entitlements.js](../../backend/api/me/entitlements.js), [frontend/app.js](../../frontend/app.js), fonction `refreshEntitlements`.

## 6. Renouvellement et expiration

Le renouvellement est manuel : l’administrateur prolonge la date de fin ou attribue un nouvel abonnement, puis enregistre séparément le paiement.

Le champ `auto_renew` existe et peut être modifié dans le formulaire générique, mais aucun mécanisme ne réalise ce renouvellement. Il n’existe pas de prélèvement ni de relance de paiement automatiques dans ce flux.

À l’échéance, le calcul des droits cesse de retenir l’abonnement. La ligne en base ne change pas automatiquement de statut : elle peut donc rester affichée **Actif** alors que la formule effective est redevenue **Gratuit**.

Le tableau de bord permet de retrouver les abonnements actifs ou en essai dont l’échéance intervient dans les sept jours à venir. Il s’agit d’un accès à une liste filtrée, pas d’un processus automatique de renouvellement.

## 7. Autres points d’entrée et cohérence

### Création et modification génériques

L’écran **Abonnements** permet aussi de créer ou modifier directement une ligne : utilisateur, code de formule, statut, dates et renouvellement automatique.

Cette création générique ne passe pas par la route d’attribution de la fiche utilisateur. Elle ne résilie donc pas les autres abonnements actifs. Plusieurs lignes éligibles peuvent coexister ; le calcul des droits choisit la plus récente selon `started_at`.

La fiche utilisateur affiche quant à elle le dernier abonnement selon sa date de début, quel que soit son statut ou sa validité. Cet affichage peut différer de l’abonnement effectivement retenu pour les droits.

Sources : [admin/src/resources.ts](../../admin/src/resources.ts), [backend/api/admin/resources.js](../../backend/api/admin/resources.js), [backend/api/admin/router.js](../../backend/api/admin/router.js).

### Coupons

Les coupons sont configurables, avec réduction, validité et nombre maximal d’utilisations. Leur réduction n’est pas raccordée au parcours actuel d’attribution et de saisie des paiements.

## 8. Difficultés constatées

| Point | Conséquence actuelle |
|---|---|
| Attribution et paiement séparés | Une formule peut être activée sans paiement, ou un paiement enregistré sans prolonger l’accès. |
| Dates saisies manuellement | Risque d’oublier l’échéance ou de laisser involontairement un abonnement sans limite de durée. |
| Essai annoncé sans activation automatique | Les jours d’essai affichés ne suffisent pas à créer et borner un essai. |
| Expiration sans mise à jour du statut | L’interface peut afficher « Actif » alors que les droits sont revenus à Gratuit. |
| Deux chemins de création | Le formulaire générique peut laisser plusieurs abonnements actifs en parallèle. |
| Affichage et calcul des droits différents | Le dernier abonnement montré sur une fiche n’est pas nécessairement celui qui donne les droits. |
| Paiement sans rapprochement tarifaire | Le montant est saisi librement, sans vérification automatique du prix ou de la période couverte. |
| Coupons non raccordés | Les réductions configurées ne sont pas appliquées dans ce flux. |
| Informations dispersées | Comprendre la situation d’un client demande de naviguer entre utilisateur, abonnement, paiement et facture. |
| Actualisation différée côté application | Le client peut devoir actualiser sa formule après une intervention administrative. |

Ce constat sert de base à la définition d’un parcours de gestion des abonnements plus cohérent. Aucune refonte n’est décrite comme déjà réalisée dans ce document.
