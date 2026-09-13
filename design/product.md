# PRODUCT.md — Spécifications Produit : App'lika (VetBook Redesign)

## 1. Vision & Objectifs Produit

### 1.1 Vision
**App'lika** est l'application compagnon tout-en-un de référence pour la santé, le bien-être et le suivi quotidien des animaux de compagnie (chiens, chats, NAC). Elle fait le pont entre le propriétaire de l'animal et les professionnels de santé animale (vétérinaires, cliniques, urgences SAMU 3115), en combinant :
- Un carnet de santé numérique certifié et sécurisé.
- Un suivi quotidien dynamique (nutrition, pesées, activités, cycles reproductifs).
- Une gestion financière et mutuelle transparente.
- Une plateforme d'accès immédiat aux urgences et aux conseils validés cliniquement.

### 1.2 Objectifs Métier & Utilisateur
- **Rappels & Observance** : Réduire à zéro les oublis vaccinaux et antiparasitaires grâce à des rappels proactifs (push & calendrier .ics synchronisé).
- **Réactivité Urgence** : Fournir un accès en 1 clic au SAMU Vétérinaire (3115) et aux cliniques de garde avec géolocalisation et fiche d'urgence préremplie.
- **Continuité Multi-plateforme (Mobile-First & Desktop)** : Offrir une expérience fluide sur smartphone au quotidien (saisie rapide, pesées, rappels) et un tableau de bord analytique complet sur ordinateur pour les bilans vétérinaires.
- **Pérennité & Souveraineté des données** : Fonctionnement 100 % local avec synchronisation Cloud sécurisée chiffrée de bout en bout (AES-256) et export standardisé (JSON / PDF certifié).

---

## 2. Personas Cibles

### Persona 1 : Sarah D. (Propriétaire multi-animaux, active et prévoyante)
- **Profil** : Propriétaire d'un Golden Retriever (Rio, 3 ans) et d'un chat.
- **Besoins** : Suivre le calendrier vaccinal, contrôler le budget santé avec sa mutuelle SantéVet, calculer les rations de croquettes selon la dépense énergétique.
- **Pain Points** : Perte des carnets papier, oubli des dates limites de pipettes tiques/puces, méconnaissance des aliments toxiques.

### Persona 2 : Dr Camille Fabre (Vétérinaire praticien référent)
- **Profil** : Vétérinaire en clinique de quartier.
- **Besoins** : Avoir un historique clair des soins antérieurs, visualiser rapidement la courbe de poids et de croissance, consulter les photos horodatées d'une lésion post-opératoire.
- **Bénéfice App'lika** : Fiche synthétique claire partagée par le propriétaire ou exportée au format PDF officiel.

---

## 3. Architecture Fonctionnelle & Périmètre des Écrans

### 3.1 Vue d'Ensemble & Tableau de Bord
- **Mobile (`SCREEN_62`) & Desktop (`SCREEN_29`)** :
  - **Identité de l'animal actif** : sélecteur rapide d'animal (avatar, race, âge, statut vaccinal, statut de stérilisation).
  - **Bouton d'Urgence Vital** : badge "SAMU 3115 Gratuit" + "Clinique de garde ouverte à proximité".
  - **Indicateurs Clés (KPIs)** :
    - Score de protection globale (Vaccins CHPLR + Rage, alertes à 14 jours).
    - Poids actuel vs couloir de gabarit idéal vétérinaire.
    - Ration journalière (grammage consommé vs recommandé, calories kcal).
    - Suivi du budget annuel & taux de remboursement mutuelle.
  - **Soins à venir & Rappels** : filtres par typologie (Vaccins, Parasites, Hygiène, Consultations).
  - **Routine du jour** : checkboxes de validation repas matin/soir, balades, traitements oraux.

### 3.2 Carnet de Santé & Fiches Médicales
- **Mobile (`SCREEN_64`) & Desktop** :
  - **Vaccins & Déparasitage** : date d'injection, nom commercial (ex. Milbemax, Frontline Combo), lot, praticien, alerte de rappel.
  - **Soins d'Hygiène & Toilettage** : brossage dentaire, coupe des griffes, nettoyage des yeux et oreilles.
  - **Médicaments & Posologie** : traitements en cours (antibiotiques, anti-inflammatoires, compléments), fréquence et date de fin.

### 3.3 Consultations & Budget Santé
- **Mobile (`SCREEN_31`) & Desktop** :
  - Historique chronologique complet des actes médicaux et consultations vétérinaires.
  - Détail par acte : motif, diagnostic, ordonnance rattachée, coût facturé, remboursement mutuelle perçu, reste à charge.
  - Synthèse annuelle (budget global 12 mois glissants vs plafond mutuelle).
  - Contact direct du praticien traitant (appel en 1 tap, itinéraire, prise de RDV).

### 3.4 Suivi Quotidien : Nutrition, Poids & Activité
- **Mobile (`SCREEN_33`) & Desktop** :
  - **Calculateur métabolique automatisé** : RER (Resting Energy Requirement) et MER (Maintenance Energy Requirement) en fonction du coefficient physiologique (stérilisé, sédentaire, actif).
  - **Plan nutritionnel** : marque de l'aliment, répartition en portions/repas.
  - **Courbe de poids & croissance** : graphe interactif avec couloir morphologique idéal.
  - **Suivi des balades et dépenses** : durée, kilométrage, type d'activité (jeu, natation, agility).

### 3.5 Suivi des Chaleurs & Reproduction
- **Desktop (`SCREEN_12`) & Mobile** :
  - Prévision algorithmique des prochaines chaleurs selon le cycle moyen individuel.
  - Visualisation des phases du cycle ovarien : Proœstrus, Œstrus (fenêtre fertile), Diœstrus, Anœstrus.
  - Relevé des symptômes (pertes, intensité comportementale).
  - Fiches de prévention clinique : détection précoce du pyomètre, lactations de pseudo-gestation, conseils de stérilisation préventive.

### 3.6 Annuaire, Cliniques & Urgences 24/7
- **Mobile (`SCREEN_60`)** :
  - Numéro direct d'urgence SAMU Vétérinaire 3115 (appel gratuit 24h/7j).
  - Centre antipoison animalier (CNITV Lyon / CAPAE-Ouest Nantes).
  - Géolocalisation des cliniques et hôpitaux vétérinaires ouverts avec distance en temps réel.
  - Mode d'emploi des gestes d'urgence (arrêt cardiaque, coup de chaleur, torsion d'estomac).

### 3.7 Fiche d'Identité & Passeport I-CAD
- **Mobile (`SCREEN_59`) & Modale Saisie Rapide (`SCREEN_4`)** :
  - Numéro de puce / transpondeur (15 chiffres) avec scanner OCR / code-barres.
  - Passeport européen officiel et données de pedigree (LOF / LOMAD).
  - QR Code médaille connectée scannable par toute personne retrouvant l'animal égaré (affiche le contact propriétaire sans nécessiter l'application).

### 3.8 Album Photo Clinique & Moments de Vie
- **Desktop (`SCREEN_2`)** :
  - Stockage d'images haute définition avec horodatage EXIF.
  - Catégorisation double : Souvenirs de vie (vacances, agility) vs Suivi clinique (photos de cicatrices, état des gencives pour examen à distance).
  - Générateur de planche récapitulative PDF pour transmission au vétérinaire.

### 3.9 Communauté, Événements & Centre d'Aide
- **Desktop (`SCREEN_6`, `SCREEN_10`) & Mobile (`SCREEN_8`)** :
  - Calendrier national des événements canins et félins (journées d'adoption, expos, sensibilisation).
  - Fiches conseils vétérinaires vérifiées (alimentation toxique, gestes de secours, éducation positive).
  - FAQ technique & guide de synchronisation locale/cloud.

### 3.10 Compte & Paramètres Utilisateur
- **Mobile (`SCREEN_55`, `SCREEN_57`)** :
  - Gestion du profil du propriétaire (coordonnées, adresse).
  - Gestion du Cloud chiffré et synchronisation multi-terminaux.
  - Export brut au format JSON et import de sauvegarde.
  - Préférences de notifications et langue (FR).

---

## 4. Spécifications Techniques & Architecture Logique

### 4.1 Frontend Architecture
- **Framework recommandé** : React (Next.js ou Vite SPA / PWA) ou Vue 3 (Nuxt 3).
- **Style & Design Tokens** : Tailwind CSS v3.4+ configuré avec les variables CSS du Design System App'lika (`DESIGN.md`).
- **Composants d'icônes** : Lucide React ou Heroicons (trait de 1.75px à 2px).
- **Graphiques & Visualisations** : Chart.js / Recharts (courbes de poids, jauge de calories, frise temporelle de fertilité).
- **Support Hors-Ligne (Offline-First)** : Service Worker PWA + IndexedDB (Dexie.js) pour persistance locale garantie.

### 4.2 Stockage & Données
- **Format de données pivot (Schéma JSON)** :
  - `Animal` : id, name, species (canine, feline, other), breed, birthDate, gender, isNeutered, weightHistory[], chipNumber, passportNumber, photoUrl, nutritionalPlan, reproductiveCycles[].
  - `HealthRecord` : id, animalId, type (vaccine, deworming, hygiene, consultation, medication), date, dueDate, practitioner, cost, refundedAmount, attachments[].
  - `User` : id, email, fullName, phone, defaultClinic, cloudSyncEnabled, lastSyncTimestamp.

### 4.3 Sécurité & Confidentialité
- Données de santé animale hébergées conformément au RGPD.
- Chiffrement client-side optionnel des fiches médicales avant synchronisation Cloud.
- Export standardisé au format JSON ouvert pour garantir la portabilité des données du propriétaire.
