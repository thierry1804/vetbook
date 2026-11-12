# Lecture du carnet de santé par photo — conception

Date : 2026-11-12 · Statut : implémenté (branche `feature/lecture-carnet-photo`) ; vérification avec de vraies photos et un vrai modèle **en attente** (clé OpenRouter et photos à fournir).

Écarts à l'implémentation : le réglage `ai_vision_model` vit dans `api/admin/ai.js` et l'écran Assistant IA (pas `settings-typed.js`) ; modèle par défaut `google/gemini-2.5-flash`, à confirmer par un vrai appel ; la contrainte `ai_usage_log.source` accepte `booklet` ; la modale s'ouvre sur un écran « Prendre la photo » qui affiche la mention de confidentialité avant tout envoi.

## Intention

Le propriétaire a le carnet de santé papier de son chien, rempli à la main et tamponné par le vétérinaire. Ressaisir chaque acte dans l'app est fastidieux, si bien que des rappels se perdent. Avec cette fonctionnalité, il photographie une page du carnet, l'app lit les actes (vaccins, déparasitages, soins d'hygiène, pesées) et les range au bon endroit dans la fiche de l'animal, avec les rappels qui en découlent dans l'agenda et les notifications.

**Critère de réussite** : une page typique (le dernier nettoyage d'oreilles, un déparasitage, un poids et un rappel) se retrouve dans l'app en moins d'une minute, sans ressaisie, et chaque valeur enregistrée a été vue par le propriétaire.

## Ce qu'a décidé le propriétaire du produit

- **Un carnet à la fois** : la photo concerne l'animal dont la fiche est ouverte.
- **Formules payantes uniquement** : cadenas en gratuit, comme l'assistant IA.
- **Écran de vérification obligatoire** avant tout enregistrement (maquette validée, reproduite ci-dessous).
- **Types reconnus** : vaccins, déparasitages, hygiène (dont le nettoyage), poids. Pour chacun : la date, le nom (produit ou soin) et le prochain rappel ; pour les vaccins, le vétérinaire si son tampon est lisible.

## Objectifs

1. Reconnaître sur une photo de page les actes des quatre types ci-dessus.
2. Les présenter dans un écran de vérification où tout est modifiable, cochable ou décochable.
3. Après validation, les enregistrer exactement comme une saisie manuelle : mêmes tableaux d'état, même synchro, mêmes rappels.

## Non-objectifs (v1)

- Plusieurs animaux sur une même photo.
- Consultations, traitements en cours, chaleurs, saillies (le format de sortie pourra les accueillir plus tard).
- Conserver la photo du carnet. Elle n'est stockée nulle part ; l'option « garder dans la galerie » est une piste pour plus tard.
- Analyse hors ligne ou dans le navigateur.
- Plusieurs pages en un seul envoi : on traite une page, puis on peut en photographier une autre.

## Anti-objectifs : échec, même si « ça marche »

- **Enregistrer quoi que ce soit sans validation explicite.** Un faux rappel créé en silence est pire que rien.
- **Présenter une valeur incertaine ou estimée comme certaine.**
- **Créer des doublons** quand on photographie une page déjà saisie.
- Rendre la fonction utilisable en gratuit (coût IA non maîtrisé).

## Parcours utilisateur

1. Sur la fiche de l'animal (en-tête des onglets Vaccins et Déparasitage, plus le menu d'ajout rapide), un bouton **« Scanner le carnet »**. En gratuit, il porte le cadenas habituel ; un appui ouvre l'explication des formules (comportement standard de `ROUTE_FEATURES`).
2. L'appui ouvre l'appareil photo sur mobile (`<input type="file" accept="image/*" capture="environment">`), ou le sélecteur de fichier sur ordinateur. Une ligne précise que la photo est envoyée au service de lecture puis n'est pas conservée.
3. Pendant l'analyse : un état d'attente (« Lecture du carnet… », de quelques secondes à environ 20 s) avec un bouton Annuler.
4. **Écran de vérification** (maquette ci-dessous), groupé dans cet ordre : Vaccins, Déparasitage, Hygiène, Poids, puis « Déjà dans l'app ».
   - Chaque ligne se coche ou se décoche ; un appui sur une valeur permet de la modifier (date, nom, type interne/externe, rappel, poids, vétérinaire).
   - Une valeur marquée incertaine par la lecture est **surlignée en ambre** avec l'étiquette « à vérifier », et un bandeau en haut le signale.
   - Un rappel absent du carnet mais estimé porte l'étiquette « estimé : N j » ; un rappel lu porte « écrit sur le carnet ».
   - Une ligne qui existe déjà dans l'app est **décochée d'office**, rangée sous « Déjà dans l'app », avec l'étiquette « déjà enregistré ».
   - Si le nom ou le n° de puce lus sur la page diffèrent de l'animal ouvert, un bandeau ambre le signale (« Cette page semble concerner "Max", pas Rex »). C'est un simple avertissement, il ne bloque pas.
   - Bouton principal : « Enregistrer N éléments » (N = lignes cochées), désactivé à 0. Lien secondaire « Reprendre la photo ».
5. Après l'enregistrement : un toast (« 4 éléments ajoutés au carnet de Rex »), retour à la fiche, onglets rafraîchis.
6. Si rien n'est reconnu, un message explique pourquoi (« Aucun acte lisible sur cette photo. Essaie avec plus de lumière, la page bien à plat. »), avec « Reprendre la photo ».

Maquette validée (mobile) : `.superpowers/brainstorm/…/content/verification.html` (version initiale sans vaccins ; les vaccins s'ajoutent en tête, sur le même modèle de ligne).

## Architecture

### Front (`frontend/app.js`, ES2019, sans modules)

- **Réduction de la photo** avant l'envoi : canvas, 1600 px maximum sur le grand côté, JPEG qualité 0,8 (une photo de téléphone de 4 à 8 Mo tombe à environ 300 Ko). Pas de dépendance ajoutée.
- **Envoi** : `POST /api/ai/booklet-scan` en `multipart/form-data` (`photo`, `petLocalId`), via un nouvel appel de `window.cloudSync` (comme `uploadPhoto`), qui rejette proprement hors connexion.
- **Écran de vérification** : nouvelle modale construite comme les autres de l'app, avec piège du focus, Échap, retour du focus et noms accessibles, pour passer `tests/accessibility-smoke.mjs`.
- **Dédoublonnage** côté front, contre l'animal courant : une ligne est un doublon si un élément existant du même type a la même date et un nom équivalent après normalisation (minuscules, sans accents ni espaces). Pour le poids : même date et même valeur à 0,1 kg près.
- **Enregistrement** des lignes cochées, dans les tableaux existants avec `state.nextId++`, comme les fonctions de saisie manuelle :
  - vaccin → `data.vaccines` `{ date, name, next, frequencyDays, vet }` ;
  - déparasitage → `data.dewormings` `{ date, name, next, frequencyDays, type }` ;
  - hygiène → `data.hygiene` `{ type, date, next, frequencyDays, notes }` ;
  - poids → `data.animal.weightHistory` `{ date, weight }`, puis `syncAnimalWeightFromHistory(data)`.

  Ensuite `saveState()` puis `refreshAll()` : la synchro existante fait le reste. Aucun changement de schéma ni de `mapping.js`.
- **Garde-fous** : `ROUTE_FEATURES` reçoit l'entrée du bouton → `booklet_scan`.

### API (`backend/`)

- **Route** `POST /api/ai/booklet-scan`, déclarée dans `server.js` avec un limiteur dédié (20 analyses par heure et par IP). Le corps est lu par multer en mémoire, limité à 8 Mo, images uniquement.
- **Contrôles, dans l'ordre** : `requireUser` → garde de formule `booklet_scan` (même logique que `guardAiAssistant` : payant même si `subscriptions_enforced` est désactivé ; factoriser plutôt que dupliquer) → IA activée et clé présente (sinon 503 avec message) → l'animal `petLocalId` appartient à l'utilisateur (son nom et sa puce servent au contrôle de concordance).
- **Appel du modèle** via `api/_lib/ai.js` : nouvelle fonction (par exemple `extractBookletEntries`) qui réutilise la mécanique existante (clé déchiffrée, `reserveAiAttempt`/`finishAiAttempt` avec `source: 'booklet'`, timeout, une retentative sur erreur transitoire, `fetchImpl` injectable pour les tests). Le message envoyé au modèle contient le prompt d'extraction (texte) et l'image en `data:image/jpeg;base64,…`. On demande une sortie JSON (`response_format: { type: 'json_object' }`) avec `temperature: 0`.
- **Modèle de vision** : nouveau réglage `ai_vision_model`, distinct de `ai_model` (le modèle de l'assistant par défaut, DeepSeek, ne lit pas les images). Valeur par défaut : un modèle multimodal d'OpenRouter rapide et bon marché, à choisir à l'implémentation et à documenter. Le réglage est modifiable dans l'écran backoffice Système > Assistant IA, avec un bouton Tester sur une image d'exemple.
- **Contrat de sortie demandé au modèle** :
  ```json
  { "petName": "Rex", "chip": "250…", "entries": [
    { "kind": "vaccine|deworming|hygiene|weight", "date": "AAAA-MM-JJ", "name": "…", "type": "interne|externe",
      "next": "AAAA-MM-JJ", "weightKg": 12.4, "vet": "…", "uncertain": ["date"] } ] }
  ```
- **Normalisation côté serveur**, dans une fonction pure testable : on ne fait pas confiance à la sortie du modèle.
  - `kind` sur liste blanche, sinon la ligne est ignorée.
  - Dates converties en ISO ; une date illisible est conservée en texte brut et marquée incertaine.
  - `date` future : marquée incertaine.
  - `next` antérieur à `date` : rappel retiré.
  - Poids hors de [0,1 ; 150] kg : ligne ignorée.
  - Textes tronqués à 120 caractères.
  - Hygiène : on rapproche `name` des types connus (`Brossage dents`, `Coupe griffes`, `Bain`, `Toilettage`, `Nettoyage oreilles`, `Nettoyage yeux`, plus la liste publiée `lists.hygiene`) ; sans correspondance, on garde le texte lu.
  - Déparasitage : `type` par défaut `interne`.
- **Rappel estimé** : si `next` est absent, le serveur cherche le produit dans `ref_vaccines` ou `ref_antiparasitics` (nom normalisé, espèce de l'animal) et, s'il y a un `default_interval_days`, renvoie `next` calculé avec `nextEstimated: true` et `frequencyDays`. Rien n'est estimé pour l'hygiène et le poids.
- **Réponse** : `{ entries: [...], petName, chip, mismatch: boolean }`. **Rien n'est écrit en base.** La photo n'est ni stockée ni journalisée ; la ligne `ai_usage` existante ne garde que le compteur, comme pour l'assistant.
- **Erreurs** : 402 (formule), 413 (photo trop lourde), 415 (pas une image), 422 (aucun acte reconnu, avec un message de conseil), 503 (IA indisponible), 502 (modèle en échec après retentative).

### Formules et backoffice

- Nouvelle fonctionnalité `booklet_scan` (« Lecture du carnet par photo », catégorie Assistant IA) dans `FEATURES` de `api/_lib/admin-seed.js`, fermée sur `gratuit`, avec une migration unique d'ajout aux formules existantes, sur le modèle de `seed_feature_ai_assistant_v1`.
- La matrice des droits du backoffice la montre automatiquement.
- Réglage `ai_vision_model` dans `settings-typed.js` et dans l'écran Assistant IA de l'admin.

## Tests attendus

- **Unitaires (`backend/tests/`, ajoutés à `test:unit`)** : normalisation (dates françaises `12/09/2026`, `12-09-26`, mois en lettres ; incertitudes ; bornes de poids ; `kind` inconnu ; rappel antérieur ; rapprochement des types d'hygiène).
- **Intégration** : route complète avec `fetchImpl` simulé (aucun appel réseau réel) : 401 sans session, 402 en gratuit, 200 en payant, rappel estimé depuis `ref_antiparasitics`, animal d'un autre utilisateur refusé, 415 et 413, rien d'écrit en base, compteur `ai_usage` incrémenté.
- **Front (smoke Playwright, API simulée)** : bouton cadenassé en gratuit ; en payant, une réponse simulée affiche les groupes dans le bon ordre, la valeur incertaine surlignée, le doublon décoché ; « Enregistrer » ajoute exactement les lignes cochées aux bons onglets ; contrôles de l'écran nommés (a11y).
- **e2e (stack réelle)** : pas d'appel au vrai modèle en CI (coût, instabilité). On ajoute le parcours si l'API accepte un modèle simulé en environnement de test. Sinon, c'est couvert par l'intégration et le smoke : à trancher par le constructeur, sans contourner la sécurité en production.
- **Vérification manuelle** avant livraison : 2 ou 3 vraies photos de carnet (manuscrit, vignettes de vaccins) contre le vrai modèle, avec captures de l'écran de vérification.

## Laissé au constructeur

Le choix exact du modèle de vision par défaut et le texte du prompt d'extraction, le libellé fin des messages, l'emplacement précis du bouton dans chaque onglet, et le découpage du code (nouveau fichier front ou section de `app.js` : si c'est un nouveau fichier, l'ajouter à `scripts/build.mjs` et `eslint.config.js`).

## Choix faits par Claude, à vérifier

- Une page par analyse, pas d'envoi multiple.
- La photo n'est pas conservée.
- L'avertissement en cas de nom ou de puce différents ne bloque pas.
- Le rappel est estimé à partir des référentiels du backoffice, jamais inventé par le modèle.
- Le dédoublonnage se fait sur le même type, la même date et un nom normalisé.
- Le poids enregistré met à jour le poids courant via l'historique, comme une pesée manuelle.
- Le modèle de vision a son réglage propre, distinct de celui de l'assistant.
- Limite de 20 analyses par heure, photo réduite à 1600 px.
