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

## PWA (Progressive Web App)

VetBook est une **PWA** : elle peut être installée sur mobile ou bureau (menu « Ajouter à l’écran d’accueil » / « Installer l’application ») et fonctionne en **hors ligne** pour l’interface (données déjà chargées dans localStorage).

- **manifest.json** : nom, couleurs, mode `standalone`, icônes
- **sw.js** : service worker qui met en cache l’app shell (HTML, CSS, JS) et sert la page en cache si le réseau est indisponible
- **Icônes** : `icons/icon-192.png` et `icons/icon-512.png` (placeholders 1×1 par défaut ; pour une meilleure expérience d’installation, remplacez-les par de vraies icônes 192×192 et 512×512)

Pour que l’installation soit proposée, l’app doit être servie en **HTTPS** (ou en `localhost` en dev).

## Fichiers

- `index.html` — structure sémantique et modales
- `styles.css` — mise en forme responsive (variables CSS, teal/crème/ambre)
- `app.js` — logique (état, localStorage, rendus, enregistrement du SW)
- `manifest.json` — manifeste PWA
- `sw.js` — service worker (cache)
- `icons/` — icônes PWA (192×192, 512×512)

## Lancement

Ouvrir `index.html` dans un navigateur (ou servir le dossier avec un serveur local). Aucune dépendance externe hormis les polices Google (Playfair Display, DM Sans). Pour tester la PWA (installation, hors ligne), utilisez un serveur local (ex. `npx serve .`) et un navigateur compatible (Chrome, Edge, Safari).
