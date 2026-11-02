# Médaille, recherche et échanges entre propriétaires — 2 novembre 2026

## Ce qui a changé

### Médaille d’identité

- La création d’une médaille est explicite. Ouvrir la fiche d’un animal ne crée plus de lien public.
- Le propriétaire choisit les informations visibles après le scan : nom du propriétaire, téléphone, photo, puce, espèce, race, sexe, naissance, couleur, stérilisation et poids. Le téléphone et la puce sont masqués par défaut, y compris pour les médailles déjà créées.
- « Créer un nouveau lien » invalide immédiatement l’ancien QR code. « Révoquer le lien » désactive la fiche et la photo publiques ; une simple visite ou un rechargement ne réactive pas la médaille.
- La fiche publique et sa photo ne sont pas mises en cache. L’accès repose sur un jeton non devinable et ne révèle ni carnet ni notes. La page interdit la transmission du jeton dans le référent HTTP.

**Utilisation :** ouvrir le profil de l’animal, puis « Médaille & QR code d’identité ». Créer la médaille, cocher les informations à partager, enregistrer la visibilité et télécharger le QR code. Après une rotation, télécharger et imprimer le nouveau code. Après révocation, l’ancien code renvoie une fiche introuvable.

### Recherche d’animaux

- La pagination continue au-delà des 100 premiers résultats. L’API refuse les offsets invalides au lieu de les remplacer silencieusement.
- L’ordre utilise la date de mise à jour puis l’identifiant, pour départager les animaux ayant la même date.
- Le champ de recherche a un nom accessible et les résultats sont annoncés aux technologies d’assistance.

### Messages et modération

- L’ouverture d’une conversation charge les 50 messages les plus récents. « Charger les messages précédents » remonte par pages de 50. L’actualisation périodique conserve les pages chargées et affiche les nouveaux messages.
- La liste des conversations se charge désormais par pages de 20, avec un curseur sur la dernière activité et l’identifiant. Le bouton « Charger les conversations précédentes » permet de parcourir les fils anciens, sans limite fixe à 200. Des index servent cet ordre de lecture. Un fil qui reçoit un nouveau message remonte en tête lors du prochain chargement de la liste.
- Chaque participant peut bloquer l’autre compte. Le blocage clôt la conversation et interdit tout nouveau message ou ouverture d’un fil entre ces deux comptes. Le déblocage ne rouvre pas une conversation close.
- Chaque participant peut signaler une conversation avec un motif de 10 à 1 000 caractères. Le support reçoit une notification et voit le signalement, les comptes concernés et les 50 derniers messages dans « Demandes de support ». Il peut marquer le signalement traité ou le rouvrir.
- Un compte peut envoyer au plus cinq messages par minute dans un même fil. Le contrôle est réalisé dans une transaction verrouillant le fil, afin que des envois parallèles ne contournent pas la limite. La limite IP existante reste appliquée.
- Le formulaire de signalement est intégré au fil, possède une étiquette explicite et reçoit le focus à l’ouverture. Le champ de message est nommé et l’historique reste navigable sans annoncer à nouveau toutes les bulles à chaque actualisation.

### Parcours et accessibilité

- Après l’introduction, le focus rejoint le bouton d’ajout d’animal. Les dialogues d’ajout indiquent leur modalité, gardent la navigation Tab à l’intérieur et rendent le focus au déclencheur à la fermeture, y compris par clic sur le fond.
- Les filtres de rappels indiquent leur catégorie et leur période, et exposent leur état sélectionné avec `aria-pressed`.
- Le passage à une rubrique du compte et à la page Notifications place le focus sur son titre. Les actualisations de notifications préservent le focus sur le contrôle actif ou sur le titre.
- La période choisie dans la demande d’abonnement expose aussi son état sélectionné.

## Vérifications

- `node --check` sur les modules API et le front.
- Compilation TypeScript et Vite du backoffice.
- Test d’intégration `backend/tests/pet-social.test.mjs` sur une base PostgreSQL Docker temporaire : visibilité et propriété de la médaille, rotation, révocation, recherche au-delà de 100 résultats, accès au fil, pagination des messages, signalement et limite d’envoi.
- Le même test crée 45 conversations et vérifie les trois pages, l’absence de doublon, le curseur invalide et l’isolation entre comptes.
- `cd frontend && npm run test:browser` construit le front puis lance Chromium contre un serveur local et des réponses API simulées. Installer d’abord le navigateur avec `npx playwright install chromium` sur une nouvelle machine ; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permet de choisir un Chromium déjà présent. Le test couvre l’introduction, l’ajout d’animal, les filtres de rappels, le compte, les notifications invité et connecté, les trois étapes de demande d’abonnement, le chargement des messages anciens et des conversations suivantes. Il vérifie les noms des contrôles visibles, les retours de focus, l’absence d’erreurs JavaScript et de débordement horizontal à 390 et 1 280 px.
- `cd frontend && npm run lint` passe. Deux fonctions anciennes inutilisées pour les liens de race ont été supprimées pour rendre ce contrôle exploitable.

## Point d’attention

Les liens de médaille déjà imprimés restent valables, mais le téléphone et la puce ne s’affichent plus tant que le propriétaire ne les active pas. La rotation et la révocation exigent une nouvelle impression pour disposer d’un QR code actif.
