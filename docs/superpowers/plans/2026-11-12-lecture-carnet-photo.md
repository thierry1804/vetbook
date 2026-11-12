# Lecture du carnet par photo — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** photographier une page du carnet de santé papier, faire lire les vaccins, déparasitages, soins d'hygiène et pesées par un modèle de vision, les faire vérifier par le propriétaire, puis les enregistrer comme une saisie manuelle.

**Architecture :** le front réduit la photo et l'envoie à `POST /api/ai/booklet-scan`. L'API vérifie la formule, appelle OpenRouter (modèle de vision configurable) puis **normalise** la sortie avec une fonction pure. Elle estime les rappels manquants à partir des référentiels et renvoie des propositions **sans rien écrire en base**. Le front affiche l'écran de vérification, marque les doublons, puis pousse les lignes cochées dans les tableaux d'état existants ; la synchro existante fait le reste.

**Tech Stack :** Express 4 + `pg` + multer (API, ESM), JS vanilla ES2019 sans modules (front), React 18 + antd 5 (admin), tests `node:test` / scripts Node + Playwright.

**Spec :** `docs/superpowers/specs/2026-11-12-lecture-carnet-photo-design.md`. Écart avec la spec : le réglage `ai_vision_model` vit dans `api/admin/ai.js` et `admin/src/AiSettings.tsx` (là où se trouve déjà `ai_model`), pas dans `settings-typed.js`.

## Global Constraints

- Code, commentaires, messages et commits **en français**. Front : tutoiement. Front en ES2019 (`var`, `function`, pas de `import`).
- Code de fonctionnalité : `booklet_scan`, libellé « Lecture du carnet par photo », catégorie « Assistant IA », **fermée sur `gratuit`**, payante même si `subscriptions_enforced` est désactivé.
- Types reconnus (`kind`) : `vaccine`, `deworming`, `hygiene`, `weight`. Ordre d'affichage : Vaccins, Déparasitage, Hygiène, Poids, puis « Déjà dans l'app ».
- **Rien n'est écrit en base par l'analyse.** La photo n'est ni stockée ni journalisée.
- Photo : réduite côté front à **1600 px** maximum sur le grand côté, JPEG qualité **0,8**. Côté API : **8 Mo** maximum, types `image/jpeg`, `image/png`, `image/webp`.
- Limiteur : **20 analyses par heure et par IP**.
- Bornes du poids : **[0,1 ; 150] kg**. Textes tronqués à **120** caractères. Type de déparasitage par défaut : `interne`.
- Types d'hygiène connus : `Brossage dents`, `Coupe griffes`, `Bain`, `Toilettage`, `Nettoyage oreilles`, `Nettoyage yeux`.
- Codes d'erreur : 402 formule, 413 trop lourd, 415 pas une image, 422 aucun acte reconnu, 503 IA indisponible, 502 modèle en échec après retentative.
- Appel au modèle : `temperature: 0`, `response_format: { type: 'json_object' }`, `source: 'booklet'` dans `ai_usage_log`.
- Vérifier avec `npm run test:fast` après chaque tâche (le hook Stop le fait aussi).

## Review Focus

1. **Le modèle répond du JSON entouré de ```` ```json ```` ou précédé de texte** : on attend que l'extraction réussisse quand même. → test `extractJson tolère les blocs de code et le texte autour` (tâche 1).
2. **Date au format français ambigu `03/04/2026`** : on attend le 3 avril (JJ/MM), jamais le 4 mars. Les années sur deux chiffres (`12/09/26`) donnent 2026. → test `parseBookletDate lit JJ/MM et les années sur deux chiffres` (tâche 1).
3. **Photo HEIC ou fichier illisible choisi depuis la galerie** : on attend un message clair (« Ce format de photo n'est pas pris en charge… »), pas d'erreur JS ni d'envoi. → test smoke `fichier non image : message, aucun appel API` (tâche 4).
4. **Changement d'animal ou perte de réseau pendant l'analyse** : on attend que les lignes validées aillent dans l'animal photographié (capturé au départ), jamais dans l'animal affiché ensuite, et qu'une erreur réseau ferme l'attente avec un toast. → test smoke `les lignes vont dans l'animal capturé au départ` (tâche 4).
5. **Réponse du modèle avec un `kind` inconnu, un poids aberrant ou un rappel antérieur à l'acte** : on attend que la ligne soit ignorée ou le rappel retiré, et jamais un 500. → tests de normalisation (tâche 1) et intégration `sortie de modèle invalide → 422` (tâche 2).

---

### Task 1 : normalisation de la sortie du modèle (fonctions pures)

**Files :**
- Create : `backend/api/_lib/booklet.js`
- Test : `backend/tests/booklet-normalize.test.mjs`
- Modify : `backend/package.json` (script `test:unit` : ajouter `tests/booklet-normalize.test.mjs`)

**Interfaces :**
- Produces :
  - `BOOKLET_KINDS = ['vaccine', 'deworming', 'hygiene', 'weight']`
  - `HYGIENE_TYPES` (les 6 libellés des contraintes globales)
  - `extractJson(text: string) -> object | null`
  - `parseBookletDate(raw: string, today: string /* 'AAAA-MM-JJ' */) -> { iso: string | null, raw: string }`
  - `normalizeBookletResult(raw: object, { today: string, hygieneTypes?: string[] }) -> { petName: string, chip: string, entries: Entry[] }`, où `Entry = { kind, date: string /* ISO ou texte brut si illisible */, name: string, type?: 'interne'|'externe', next: string, nextEstimated: false, frequencyDays: number|'', weightKg?: number, vet?: string, uncertain: string[] }`
  - `bookletPrompt(petName: string, species: string) -> string` (texte du prompt d'extraction : contrat JSON de la spec, dates en `AAAA-MM-JJ`, champ `uncertain`, « ne rien inventer, laisser vide ce qui est illisible »).

- [ ] **Step 1 : écrire les tests qui échouent** (`node:test`, `assert/strict`)

```js
test('extractJson tolère les blocs de code et le texte autour', () => {
  assert.deepEqual(extractJson('Voici :\n```json\n{"entries":[]}\n```'), { entries: [] });
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.equal(extractJson('pas de json'), null);
});
test('parseBookletDate lit JJ/MM et les années sur deux chiffres', () => {
  const t = '2026-11-12';
  assert.equal(parseBookletDate('03/04/2026', t).iso, '2026-04-03');
  assert.equal(parseBookletDate('12-09-26', t).iso, '2026-09-12');
  assert.equal(parseBookletDate('12 septembre 2026', t).iso, '2026-09-12');
  assert.equal(parseBookletDate('2026-09-12', t).iso, '2026-09-12');
  assert.equal(parseBookletDate('31/02/2026', t).iso, null);
  assert.equal(parseBookletDate('1?/09/2026', t).iso, null);
});
test('normalizeBookletResult garde les quatre types et écarte le reste', () => {
  const out = normalizeBookletResult({ petName: 'Rex', entries: [
    { kind: 'deworming', date: '12/09/2026', name: 'Milbemax', next: '12/12/2026' },
    { kind: 'consultation', date: '12/09/2026', name: 'Visite' },
    { kind: 'weight', date: '12/09/2026', weightKg: 200 },
    { kind: 'weight', date: '12/09/2026', weightKg: '12,4' },
  ] }, { today: '2026-11-12' });
  assert.deepEqual(out.entries.map((e) => e.kind), ['deworming', 'weight']);
  assert.equal(out.entries[0].type, 'interne');
  assert.equal(out.entries[0].next, '2026-12-12');
  assert.equal(out.entries[1].weightKg, 12.4);
});
test('date illisible ou future marquée incertaine, rappel antérieur retiré', () => {
  const [a, b, c] = normalizeBookletResult({ entries: [
    { kind: 'vaccine', date: '1?/09/2026', name: 'Nobivac' },
    { kind: 'vaccine', date: '12/01/2027', name: 'Rabisin' },
    { kind: 'deworming', date: '12/09/2026', name: 'Milbemax', next: '01/01/2026' },
  ] }, { today: '2026-11-12' }).entries;
  assert.deepEqual([a.date, a.uncertain], ['1?/09/2026', ['date']]);
  assert.ok(b.uncertain.includes('date'));
  assert.equal(c.next, '');
});
test('hygiène rapprochée des types connus, texte gardé sinon, textes tronqués', () => {
  const [a, b] = normalizeBookletResult({ entries: [
    { kind: 'hygiene', date: '12/09/2026', name: 'nettoyage des oreilles' },
    { kind: 'hygiene', date: '12/09/2026', name: 'x'.repeat(300) },
  ] }, { today: '2026-11-12' }).entries;
  assert.equal(a.name, 'Nettoyage oreilles');
  assert.equal(b.name.length, 120);
});
test('uncertain fourni par le modèle est conservé et filtré sur les champs connus', () => {
  const [e] = normalizeBookletResult({ entries: [{ kind: 'vaccine', date: '12/09/2026', name: 'Nobivac', uncertain: ['name', 'bidon'] }] }, { today: '2026-11-12' }).entries;
  assert.deepEqual(e.uncertain, ['name']);
});
```

- [ ] **Step 2 : lancer les tests, vérifier qu'ils échouent**

Run : `cd backend && node --test tests/booklet-normalize.test.mjs`
Expected : FAIL (`Cannot find module '../api/_lib/booklet.js'`)

- [ ] **Step 3 : implémenter `backend/api/_lib/booklet.js`**

Approche : le rapprochement d'hygiène compare des clés normalisées (minuscules, sans accents ni mots vides `de/des/du/la/le/les`) et accepte une correspondance quand tous les mots du type connu figurent dans le texte. Mois en lettres français (`janvier`…`décembre`, avec et sans accents). `extractJson` prend le premier `{` jusqu'au dernier `}` après avoir retiré les blocs de code. Ne pas importer `db.js` : ce fichier reste pur.

- [ ] **Step 4 : lancer les tests, vérifier qu'ils passent**

Run : `cd backend && node --test tests/booklet-normalize.test.mjs` → Expected : `# pass 6`, `# fail 0`. Puis `npm run test:fast` à la racine → vert.

- [ ] **Step 5 : commit**

```bash
git add backend/api/_lib/booklet.js backend/tests/booklet-normalize.test.mjs backend/package.json
git commit -m "Backend : normalisation de la lecture du carnet (dates françaises, types, bornes)."
```

### Task 2 : route `POST /api/ai/booklet-scan`, formule et rappels estimés

**Files :**
- Modify : `backend/api/_lib/ai.js` (options d'appel, `DEFAULT_VISION_MODEL`, `visionModel` dans `getAiConfig`)
- Modify : `backend/api/_lib/entitlements.js` (factoriser la garde payante)
- Modify : `backend/api/_lib/booklet.js` (ajout de `estimateReminders`)
- Modify : `backend/api/_lib/admin-seed.js` (`FEATURES`, `CLOSED.gratuit`, migration `seed_feature_booklet_scan_v1`)
- Create : `backend/api/ai/booklet-scan.js`
- Modify : `backend/server.js` (route + limiteur)
- Test : `backend/tests/booklet-scan.test.mjs` (ramassé automatiquement par `test:integration`)

**Interfaces :**
- Consumes : `normalizeBookletResult`, `extractJson`, `bookletPrompt` (tâche 1).
- Produces :
  - `callOpenRouter({ apiKey, model, messages, timeoutMs, source, fetchImpl, temperature = 0.6, maxTokens = 450, responseFormat })` : les nouveaux paramètres sont optionnels, avec les valeurs par défaut actuelles (le chat ne change pas). Même extension pour `attemptOpenRouter`.
  - `DEFAULT_VISION_MODEL` (chaîne exportée, modèle multimodal OpenRouter, avec un commentaire sur le choix).
  - `getAiConfig()` renvoie en plus `visionModel` (réglage `ai_vision_model`, défaut `DEFAULT_VISION_MODEL`).
  - `guardPaidFeature(res, userId, code, message) -> Promise<boolean>` : corps actuel de `guardAiAssistant` paramétré. `guardAiAssistant(res, userId)` devient un appel à cette fonction (message inchangé). Le 402 renvoie `{ error, feature: code, plan }`.
  - `estimateReminders(client, entries, species) -> Promise<Entry[]>` : pour un `vaccine` ou un `deworming` sans `next`, cherche le nom normalisé dans `ref_vaccines` / `ref_antiparasitics` (`species_code = species`, `default_interval_days` non nul) et pose `next`, `frequencyDays` et `nextEstimated: true` quand `date` est une date ISO.
  - `makeBookletScan({ fetchImpl = fetch } = {}) -> handler(req, res)` ; `export default makeBookletScan()`.
  - Réponse 200 : `{ petName, chip, mismatch: boolean, entries: Entry[] }`. `mismatch` vaut vrai si `petName` lu, normalisé, diffère du nom de l'animal, ou si `chip` lue diffère de la puce enregistrée (quand les deux existent).
  - Corps de la requête : `multipart/form-data`, champs `photo` (fichier) et `petLocalId` (entier, `pets.local_id` de l'utilisateur).

- [ ] **Step 1 : écrire le test d'intégration qui échoue**

Modèle : `tests/pet-social.test.mjs` (Express en processus, utilisateurs créés en SQL, cookie `applika_session`). Monter `app.post('/api/ai/booklet-scan', makeBookletScan({ fetchImpl: fakeFetch }))`. `fakeFetch` renvoie une réponse OpenRouter `{ choices: [{ message: { content } }] }` où `content` est choisi par le test, et compte ses appels. Configurer l'IA en SQL : `ai_enabled = true`, `ai_api_key_enc = encryptSecret('test')` (de `api/_lib/crypto.js`). Une formule payante active pour l'utilisateur « payant » : reprendre la façon dont `tests/subscription-workflow.test.mjs` crée une souscription. Insérer `ref_antiparasitics (species_code 'Canine', name 'Milbemax', default_interval_days 90, status 'commercialise')`. Image : un petit JPEG valide (octets en dur, ou `Buffer.from('/9j/…', 'base64')`).

Vérifications (une par `await test(...)`, style `OK nom` de `realtime.test.mjs`) :
- sans cookie → 401 ; utilisateur gratuit → 402 avec `feature === 'booklet_scan'`, et `fakeFetch` non appelé ;
- payant + `petLocalId` d'un autre utilisateur → 404 ; fichier `text/plain` → 415 ; fichier de plus de 8 Mo → 413 ;
- payant + sortie `{"petName":"Rex","entries":[{"kind":"deworming","date":"12/09/2026","name":"Milbemax"}]}` → 200, `entries[0].next === '2026-12-11'`, `nextEstimated === true`, `frequencyDays === 90`, `mismatch === false` ;
- sortie avec `petName: "Max"` pour l'animal Rex → `mismatch === true` ;
- sortie `{"entries":[]}` ou du texte sans JSON → 422 avec un message contenant « lumière » ;
- après tous les appels : `select count(*) from vaccinations/dewormings/hygiene_events where user_id = …` reste 0, et `ai_usage_log` contient des lignes `source = 'booklet'` ;
- `ai_enabled = false` → 503 ;
- le corps envoyé à `fakeFetch` contient `"temperature":0`, `"response_format":{"type":"json_object"}`, le modèle `visionModel` et une partie `image_url` commençant par `data:image/jpeg;base64,`.

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run : `npm run test:integration -- booklet-scan` (à la racine) → Expected : `✗ tests/booklet-scan.test.mjs` (module introuvable).

- [ ] **Step 3 : implémenter**, dans cet ordre :
  1. `ai.js` : paramètres optionnels, `DEFAULT_VISION_MODEL`, `visionModel`.
  2. `entitlements.js` : `guardPaidFeature`, puis `guardAiAssistant` qui l'utilise.
  3. `admin-seed.js` : entrée `['booklet_scan', 'Lecture du carnet par photo', 'boolean', 'Assistant IA']`, `'booklet_scan'` dans `CLOSED.gratuit`, migration `seed_feature_booklet_scan_v1` calquée sur `seed_feature_ai_assistant_v1`.
  4. `booklet.js` : `estimateReminders`.
  5. `ai/booklet-scan.js` : multer en mémoire (`limits: { fileSize: 8 * 1024 * 1024, files: 1 }`, `fileFilter` sur les 3 types, erreur `LIMIT_FILE_SIZE` → 413). Ordre des contrôles : `requireUser` → `guardPaidFeature(res, id, 'booklet_scan', "La lecture du carnet n'est pas incluse dans votre formule.")` → multer → IA activée et clé présente → animal de l'utilisateur (`select name, species, chip from pets where user_id = $1 and local_id = $2`) → `callOpenRouter` (modèle `visionModel`, `maxTokens: 1500`, `timeoutMs: 45000`) → `extractJson` → `normalizeBookletResult` (avec `hygieneTypes` = `HYGIENE_TYPES` + libellés de `select label from ref_lists where list_type = 'hygiene' and active`) → `estimateReminders` → 422 si aucune ligne. Le message 422 est fixe : « Aucun acte lisible sur cette photo. Essaie avec plus de lumière, la page bien à plat. » Erreur modèle → 502 « La lecture du carnet a échoué, réessaie dans un instant. »
  6. `server.js` : `const bookletLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, … message: { error: 'Trop d’analyses. Réessayez dans une heure.' } })`, puis `app.post('/api/ai/booklet-scan', bookletLimiter, trackAccess('ai.booklet'), aiBookletScan)`, à côté de `/api/ai/chat`.
  (nginx accepte déjà 15 Mo, `client_max_body_size 15m` : rien à changer.)

- [ ] **Step 4 : lancer les tests, vérifier qu'ils passent**

Run : `npm run test:integration` → Expected : `10 fichier(s) de test d'intégration au vert.` (les tests existants de l'assistant passent toujours). Puis `npm run test:fast` → vert.

- [ ] **Step 5 : commit**

```bash
git add backend
git commit -m "Backend : route de lecture du carnet par photo, formule booklet_scan et rappels estimés."
```

### Task 3 : modèle de vision réglable dans le backoffice

**Files :**
- Modify : `backend/api/admin/ai.js` (GET : `visionModel`, `defaultVisionModel` ; PUT : `visionModel` enregistré sous `ai_vision_model` et inclus dans l'audit avant/après ; test : paramètre `vision: true` qui envoie une image d'exemple embarquée)
- Modify : `admin/src/AiSettings.tsx` (champ « Modèle de lecture du carnet » sous « Modèle », placeholder `defaultVisionModel`, pris en compte par `dirty` et l'enregistrement ; bouton « Tester la lecture d'image »)
- Test : `backend/tests/booklet-scan.test.mjs` (ajouter les vérifications admin)

**Interfaces :**
- Consumes : `getAiConfig().visionModel`, `DEFAULT_VISION_MODEL` (tâche 2).
- Produces : `GET /api/admin/ai-settings` → `{ …existant, visionModel, defaultVisionModel }` ; `PUT /api/admin/ai-settings` accepte `visionModel` (chaîne tronquée à 200 caractères ; vide → défaut).

- [ ] **Step 1 : ajouter au test d'intégration** (monter `buildAdminRouter()` comme dans `realtime.test.mjs`, admin `super_admin`) : PUT `{ visionModel: 'fournisseur/modele-test', reason: 'Test' }` → 200 ; GET → `visionModel === 'fournisseur/modele-test'` ; une analyse utilisateur envoie ensuite ce modèle à `fakeFetch` ; la dernière ligne d'audit `ai` contient `visionModel` dans `after`.
- [ ] **Step 2 : lancer `npm run test:integration -- booklet-scan`** → Expected : FAIL sur `visionModel`.
- [ ] **Step 3 : implémenter le backend puis `AiSettings.tsx`** en suivant le motif existant du champ `model`.
- [ ] **Step 4 : vérifier** : `npm run test:integration -- booklet-scan` → vert ; `npm run typecheck` → vert ; `npm run build --prefix admin` → vert.
- [ ] **Step 5 : commit**

```bash
git add backend/api/admin/ai.js admin/src/AiSettings.tsx backend/tests/booklet-scan.test.mjs
git commit -m "Backoffice : modèle de vision réglable pour la lecture du carnet."
```

### Task 4 : front — bouton, analyse, écran de vérification, enregistrement

**Files :**
- Modify : `frontend/data-layer.js` (ajout de `scanBooklet`, exporté dans `window.cloudSync`)
- Modify : `frontend/index.html` (boutons « Scanner le carnet » dans les en-têtes des onglets Vaccins, ligne ~443, et Déparasitage, ligne ~481 ; entrée `data-fab="scan"` dans l'ajout rapide, ~909 ; modale `modal-scanBooklet` calquée sur `modal-addHygiene`, ~1401 ; `<input type="file" id="booklet-file" accept="image/*" capture="environment" hidden>`)
- Modify : `frontend/app.js` (section « Lecture du carnet » ; `FAB_FEATURES.scan`, `ID_FEATURES`, `GATED_MODALS.scanBooklet = 'booklet_scan'` ; branchement du `data-fab="scan"`)
- Modify : `frontend/styles.css` (styles de la vérification : groupes, lignes cochables, `.is-doubt` ambre, étiquettes « estimé », « écrit sur le carnet », « déjà enregistré », « à vérifier »), en jetons existants (teal / ambre / crème)
- Create : `frontend/tests/booklet-scan-smoke.mjs`
- Modify : `frontend/package.json` (`test:browser` lance aussi `node tests/booklet-scan-smoke.mjs`)

**Interfaces :**
- Consumes : la réponse 200 et les codes d'erreur de la tâche 2 ; `Entry` (tâche 1) avec `nextEstimated`.
- Produces :
  - `cloudSync.scanBooklet(petLocalId: number, blob: Blob, signal?: AbortSignal) -> Promise<{ petName, chip, mismatch, entries }>` (FormData `photo` + `petLocalId`, via `apiFetch`, rejet « Non connecté. » sans session).
  - Dans `app.js` : `resizeBookletPhoto(file) -> Promise<Blob>` (rejette `Error('FORMAT')` si l'image ne se décode pas), `markBookletDuplicates(entries, wrap) -> entries` (ajoute `duplicate: true`), `saveBookletEntries(animalId, entries) -> number` (nombre ajouté). Exposés sur `window.app._ctx` pour le smoke.
  - Bouton : `id="btn-scan-booklet-vaccins"` et `id="btn-scan-booklet-deworming"`, tous deux dans `ID_FEATURES` → `booklet_scan`.

Comportement à respecter :
- Au clic, capturer `animalId = state.currentAnimalId` ; tout le parcours enregistre dans **cet** animal.
- Attente : la modale affiche « Lecture du carnet… » avec Annuler (`AbortController`).
- Erreurs : 402 → `showFeatureLocked('booklet_scan')` ; 422 → message serveur + « Reprendre la photo » ; autre → toast d'erreur et fermeture de l'attente ; `FORMAT` → « Ce format de photo n'est pas pris en charge. Prends la photo avec l'appareil, ou choisis un JPEG ou un PNG. »
- Mention sous le bouton de prise de vue : « La photo est envoyée à notre service de lecture puis n'est pas conservée. »
- Vérification : groupes dans l'ordre des contraintes globales, lignes cochées sauf les doublons, champs modifiables (date, nom, type, rappel, poids, vétérinaire), bandeau ambre si au moins un `uncertain` non vide, bandeau ambre `mismatch` (« Cette page semble concerner "{petName}", pas {nom} »), bouton « Enregistrer N éléments » désactivé à 0.
- Dédoublonnage : même `kind` + même `date` + nom normalisé égal (minuscules, sans accents ni espaces) ; poids : même date et écart ≤ 0,1 kg.
- Enregistrement : objets identiques à `addVaccin` (~5233), `addDeworming` (~5365), l'ajout d'hygiène (~5912) et `addWeight` (~4722, avec `syncAnimalWeightFromHistory`) ; `id: state.nextId++` ; puis `saveState()` et `refreshAll()` ; toast « N éléments ajoutés au carnet de {nom} ».

- [ ] **Step 1 : écrire `frontend/tests/booklet-scan-smoke.mjs`** (calqué sur `accessibility-smoke.mjs` : serveur statique `dist/`, API simulée, `namedControls`, `noPageOverflow`, aucune `pageerror`). L'API simulée sert des droits `booklet_scan` activés ou désactivés selon l'en-tête de test, et `/api/ai/booklet-scan` renvoie : un Rex avec un vaccin, un déparasitage incertain (`uncertain: ['date']`, `nextEstimated: true`), un nettoyage d'oreilles, un poids, et un déparasitage identique à un existant. Avant le chargement, l'état local préparé contient Rex avec ce déparasitage existant, plus un second animal. Tests :
  - `gratuit : bouton cadenassé, pas d'appel API` ;
  - `payant : groupes Vaccins > Déparasitage > Hygiène > Poids > Déjà dans l'app`, `.is-doubt` présent, le doublon est décoché, le bouton affiche « Enregistrer 4 éléments » ;
  - `enregistrer ajoute exactement les lignes cochées` : après validation, `localStorage['vetbook_data']` contient +1 vaccin, +1 déparasitage, +1 hygiène, +1 pesée sur Rex, et rien sur l'autre animal ;
  - `les lignes vont dans l'animal capturé au départ` : réponse simulée retardée, changement d'animal via `window.app` pendant l'attente, enregistrement → les ajouts sont sur Rex ;
  - `fichier non image : message, aucun appel API` (`setInputFiles` avec un `.txt` renommé en `.jpg`) ;
  - `mismatch affiche l'avertissement` ;
  - a11y : `namedControls(page, '#modal-scanBooklet')`, Échap ferme la modale et rend le focus au bouton, pas de débordement en 390 px.
- [ ] **Step 2 : lancer `cd frontend && npm run build && node tests/booklet-scan-smoke.mjs`** → Expected : FAIL (`#btn-scan-booklet-vaccins` introuvable).
- [ ] **Step 3 : implémenter** `data-layer.js`, `index.html`, `app.js`, `styles.css`.
- [ ] **Step 4 : vérifier** : `npm run test:front` → les deux smoke tests au vert ; `npm test` → vert ; `docker compose up -d --build nginx api` puis `npm run test:e2e` → vert (pas de régression du parcours de base).
- [ ] **Step 5 : commit**

```bash
git add frontend
git commit -m "App : scanner le carnet de santé — photo, vérification et enregistrement."
```

### Task 5 : vérification réelle et documentation

**Files :**
- Modify : `CLAUDE.md` (une ligne dans l'API : « Lecture du carnet : `api/ai/booklet-scan.js` + `api/_lib/booklet.js` ; rien n'est écrit en base, le front enregistre après vérification »)
- Modify : `docs/superpowers/specs/2026-11-12-lecture-carnet-photo-design.md` (statut « livré », modèle de vision retenu, écart `settings-typed` → `admin/ai.js`)

- [ ] **Step 1 : prérequis** : clé OpenRouter active et IA activée dans le backoffice local, compte de test sur une formule payante (override `booklet_scan` dans le backoffice), 2 ou 3 vraies photos de carnet fournies par le propriétaire du produit.
- [ ] **Step 2 : déléguer à l'agent `recette-navigateur`** : parcours complet sur chaque photo, en mobile 390×844 et en bureau. Captures de l'écran de vérification et de la fiche après enregistrement. Vérifier que les rappels apparaissent dans l'agenda et que la synchro les envoie (`/api/sync/pull`).
- [ ] **Step 3 : noter pour chaque photo** ce qui a été bien lu, mal lu ou manqué. Si une erreur revient systématiquement (format de date, nom de produit), ajuster `bookletPrompt` ou la normalisation **avec un test unitaire qui la reproduit d'abord**, puis relancer l'étape 2.
- [ ] **Step 4 : `npm test` et `npm run test:e2e`** → verts.
- [ ] **Step 5 : commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-11-12-lecture-carnet-photo-design.md
git commit -m "Documentation : lecture du carnet livrée, modèle de vision retenu."
```
