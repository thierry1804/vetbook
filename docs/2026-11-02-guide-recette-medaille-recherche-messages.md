# Guide de recette — médaille, recherche, messages et parcours utilisateur

Ce guide permet de vérifier les six améliorations livrées le 2 novembre 2026. Cochez chaque résultat après l’avoir observé. Les tests peuvent se faire sur ordinateur et téléphone ; utilisez de préférence un environnement de test et des données fictives.

## Préparer la recette

1. Préparez **deux comptes utilisateurs distincts**, A et B, ayant accès à **Recherche d’animaux** et **Messages entre propriétaires**. Préparez aussi un compte administrateur autorisé à consulter **Demandes de support** (`users.support`). Si un bouton est absent ou verrouillé, vérifiez d’abord la formule et les droits de ces comptes.
2. Sur A, créez un animal au nom facilement reconnaissable, complétez son profil, puis sauvegardez le carnet. Dans sa fiche, cochez **Visible dans la recherche**. Utilisez un faux numéro de téléphone et une fausse puce pour les essais de confidentialité.
3. Ouvrez A et B dans deux profils de navigateur ou deux appareils séparés. Gardez l’accès à une caméra ou à un lecteur de QR code pour tester la médaille.
4. Pour les essais qui créent un nouveau lien, bloquent un contact ou envoient un signalement, utilisez uniquement ces comptes de test. Un ancien QR code cesse réellement de fonctionner après rotation ou révocation.

## 1. Médaille et confidentialité

Sur **A**, ouvrez la fiche de l’animal, puis **Médaille & QR code d’identité**.

| À faire | Résultat attendu |
| --- | --- |
| Ouvrir la fiche avant de créer une médaille. | **Créer une médaille** est proposé ; aucun QR code actif n’est créé par la simple ouverture. |
| Créer la médaille, puis la scanner. | La fiche publique affiche l’animal. Le téléphone et la puce sont absents par défaut ; le carnet et les notes ne sont jamais affichés. |
| Cocher **Téléphone** et **Numéro de puce**, décocher **Photo** et une autre information, puis **Enregistrer la visibilité**. Recharger la fiche publique. | Seules les informations cochées apparaissent. La photo masquée n’est plus visible. |
| Conserver l’adresse obtenue par scan, puis cliquer **Créer un nouveau lien** et confirmer. Scanner le nouveau QR code. | Le nouveau lien fonctionne. L’ancien affiche **Médaille introuvable**. Télécharger le nouveau QR code avant toute réimpression. |
| Cliquer **Révoquer le lien** et confirmer, puis recharger l’application et réessayer le dernier lien. | Le lien reste indisponible après rechargement ; aucune nouvelle médaille n’est créée automatiquement. |

## 2. Recherche d’animaux

Sur **B**, ouvrez **Recherche d’animaux** depuis la navigation. Choisissez une espèce ou saisissez au moins deux lettres du nom ou de la race, puis **Chercher**.

| À faire | Résultat attendu |
| --- | --- |
| Rechercher l’animal visible de A, puis ouvrir sa carte. | Son identité publique apparaît, sans téléphone, puce, notes ou carnet. |
| Sur A, décocher **Visible dans la recherche**, puis relancer la recherche sur B. | L’animal n’apparaît plus et sa fiche de recherche n’est plus accessible. Réactiver la visibilité pour poursuivre les tests. |
| Avec un jeu de plus de 100 animaux correspondants, cliquer plusieurs fois **Résultats suivants**. | Les résultats continuent après la cinquième page, sans répéter les précédents. Le test API automatisé couvre ce volume sans créer 100 animaux manuellement. |

## 3. Conversations, pagination et notifications

Sur **B**, depuis la fiche de l’animal de A, cliquez **Écrire au propriétaire**. Envoyez un premier message. Sur **A**, ouvrez **Recherche d’animaux → Messages**.

| À faire | Résultat attendu |
| --- | --- |
| Envoyer un message depuis B, puis répondre depuis A. | Chaque compte ne voit que ses conversations ; les nouveaux messages arrivent sans recharger la page, après quelques secondes. Une notification apparaît chez le destinataire. |
| Ouvrir le menu des notifications, puis **Voir toutes les notifications**. | Le menu et la page dédiée montrent le nouveau message. Le lien de la notification ouvre la bonne conversation. |
| Dans un fil contenant plus de 50 messages, cliquer **Charger les messages précédents**. | Les anciens messages sont ajoutés en tête ; les récents restent visibles. |
| Dans un compte ayant plus de 20 conversations, ouvrir **Messages**, puis **Charger les conversations précédentes**. | Les fils suivants s’ajoutent sans doublon. Le test API automatisé vérifie aussi 45 fils répartis sur trois pages. |
| Envoyer rapidement six messages depuis le même compte dans un fil. | Les cinq premiers passent ; le sixième reçoit une limite temporaire. Réessayer après une minute. |

## 4. Blocage et signalement

Utilisez la conversation de test entre A et B. **Terminez les essais d’envoi avant le blocage**, car celui-ci clôt le fil.

| À faire | Résultat attendu |
| --- | --- |
| Cliquer **Signaler la conversation**. Soumettre un motif de moins de 10 caractères, puis un motif de 10 à 1 000 caractères. | Le motif trop court est refusé ; le second affiche **Signalement envoyé au support**. |
| Dans l’admin, ouvrir **Demandes de support → Signalements de conversations**, puis le signalement. | Le motif, les deux comptes et les derniers messages sont visibles. L’admin peut cliquer **Marquer traité**, puis **Rouvrir**. Seuls les administrateurs autorisés y accèdent. |
| Sur A, cliquer **Bloquer ce contact** et confirmer. Tenter un nouvel envoi depuis B. | La conversation est close ; B ne peut plus envoyer de message à A ni ouvrir un nouveau fil avec A. Les anciens messages restent lisibles. |
| Sur A, cliquer **Débloquer ce contact**. | Le blocage est levé, mais la conversation close ne se rouvre pas automatiquement. |

## 5. Parcours au clavier et sur mobile

Répétez ces contrôles à environ **390 px** de large, puis sur un écran de bureau. Utilisez `Tab`, `Maj+Tab`, `Entrée` et `Échap`, sans souris.

| Parcours | Résultat attendu |
| --- | --- |
| Première visite → **Explorer sans animal**. | Le focus arrive sur **Ajouter un animal**, et non sur le fond de la page. |
| **Ajouter un animal** → parcourir le formulaire, puis `Échap`. | Les champs ont un nom compréhensible ; `Tab` reste dans le dialogue ; `Échap` ferme celui-ci et rend le focus au bouton d’ouverture. |
| Fiche animal → **Rappels** → filtres de catégorie et de période. | Les filtres fonctionnent au clavier et leur état sélectionné est annoncé. |
| **Mon compte → Formule et abonnement** → choisir une offre, avancer jusqu’à la confirmation, puis `Échap`. | Chaque étape déplace le focus sur son titre ; la période choisie est indiquée. **N’envoyez pas de demande de test en production.** Aucun paiement automatique n’est déclenché par ce parcours. |
| Menu des notifications → page **Notifications** → filtres **Toutes / Non lues**. | Le focus reste dans le menu ou sur le titre de la page après actualisation ; les boutons ont un libellé. |
| Recherche et messages → chargement des pages et formulaire de signalement. | Les boutons restent accessibles au clavier ; l’ouverture du signalement place le focus sur son motif. |

## 6. Tests automatisés

Ces commandes sont destinées à un environnement de développement. Le test navigateur utilise un serveur local et des réponses API simulées : il **n’écrit aucune donnée métier**. Le test API crée des comptes et animaux : utilisez impérativement une base PostgreSQL temporaire, jamais la base de production.

```bash
cd frontend
npm ci
npx playwright install chromium
npm run lint
npm run test:browser
```

Le test navigateur vérifie les parcours à 390 et 1 280 px, les libellés des contrôles, le focus, l’absence de débordement horizontal et les deux paginations de messagerie. Le test API est dans `backend/tests/pet-social.test.mjs` ; il vérifie notamment la révocation du QR code, la confidentialité, les accès entre comptes, plus de 100 résultats de recherche, 45 conversations et la limite d’envoi.

## Signaler un écart

Notez : **écran**, **compte utilisé** (A, B ou admin), **étapes**, **résultat attendu**, **résultat observé**, **navigateur/appareil** et, si possible, une capture. Masquez le numéro, la puce et l’adresse du lien de médaille avant de partager la capture.

Suivi technique et détails des changements : [fiabilisation de la médaille, de la recherche et des messages](2026-11-02-fiabilisation-medaille-recherche-messages.md).
