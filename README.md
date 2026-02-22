# VetBook — Carnet de Santé Animal

Application web de type **carnet de santé** pour animaux de compagnie : un seul endroit pour la fiche de l’animal, du propriétaire, l’album photo, les vaccins, le déparasitage, les rappels et l’historique.

## Concept et fonctionnalités

**Concept :** VetBook reprend l’idée du HTML fourni (VetCare/VetBook) : une interface par onglets (Profil, Photos, Vaccins, Déparasitage, Alertes, Historique) pour gérer le suivi santé d’un ou plusieurs animaux. Les données sont **sauvegardées dans le navigateur** (localStorage) et restent disponibles entre les sessions.

**Fonctionnalités principales :**
- **Profil** : fiche animal (nom, espèce, race, sexe, date de naissance, poids, couleur, puce, stérilisation, photo de profil) et fiche propriétaire (nom, téléphone, email, clinique, adresse), avec formulaires de modification en modales.
- **Multi-animaux** : bouton « + Animal » et liste déroulante dans l’en-tête pour ajouter un animal et basculer entre eux.
- **Photos** : ajout/suppression de photos dans l’album, affichage en grille, lightbox au clic.
- **Vaccins / Déparasitage** : ajout, liste avec date et rappel, statut (À jour / Bientôt / En retard), suppression.
- **Alertes** : liste des prochains rappels (J-X), préférences de notifications (toggles) sauvegardées par animal.
- **Historique** : timeline regroupant vaccins et déparasitages par date.

L’application est **responsive**, **accessible** (ARIA, rôles, labels) et **compatible** avec les navigateurs modernes.

## Fichiers

- `index.html` — structure sémantique et modales
- `styles.css` — mise en forme responsive (variables CSS, teal/crème/ambre)
- `app.js` — logique (état, localStorage, rendus, événements)

## Lancement

Ouvrir `index.html` dans un navigateur (ou servir le dossier avec un serveur local). Aucune dépendance externe hormis les polices Google (Playfair Display, DM Sans).
