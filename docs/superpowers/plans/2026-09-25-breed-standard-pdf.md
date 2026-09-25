# Breed Standard PDF Direct Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un clic sur « Standard de la race » ouvre le PDF SCC officiel quand le n° FCI est connu, sinon la page race.

**Architecture:** Script one-shot hors runtime qui télécharge les PDF hébergés sur `centrale-canine.fr/sites/default/files/fci_race/`, extrait le n° FCI + le nom de race (page 1 via `pdftotext`), aligne ces noms sur les clés déjà présentes dans `CENTRALE_CANINE_BREED_SLUGS` / alias, et écrit une table versionnée `CENTRALE_CANINE_FCI_FILES`. Au runtime, `centraleCanineBreedUrl(race)` préfère l’URL PDF, avec repli page race.

**Tech Stack:** Vanilla JS (`frontend/app.js`), Node.js + `pdftotext` (poppler) pour la génération, pas de nouvelle dépendance runtime.

## Global Constraints

- Pas d’IA ni de scrape live au chargement de la fiche.
- Pas d’afficheur PDF intégré, pas de proxy backend.
- URL PDF : `https://www.centrale-canine.fr/sites/default/files/fci_race/<file>.pdf` où `<file>` est le nom de fichier réel (`342` ou `044`, etc.).
- Libellé UI : « Standard de la race (PDF) » seulement si l’URL est un PDF ; sinon « Standard de la race ».
- UI en français ; alias existants (`Beauceron` → `bergerdebeauce`, etc.) restent la source de vérité pour les noms usuels.
- Couverture cible : maximiser le match sur les 390 slugs ; races sans PDF connu → lien page.

## File Structure

| File | Responsibility |
|------|----------------|
| `scripts/build-fci-breed-map.mjs` | One-shot : sonde les PDF SCC, extrait n°/noms, matche les clés, écrit le fragment JS |
| `frontend/app.js` | Tables `CENTRALE_CANINE_*`, résolution URL, rendu `renderIdentity` |
| `scripts/verify-breed-standard-urls.mjs` | Vérifie hors navigateur quelques cas (Beauceron→044.pdf, Labrador, race inconnue) |

---

### Task 1: Script de génération de la table FCI → fichier PDF

**Files:**
- Create: `scripts/build-fci-breed-map.mjs`
- Read: `frontend/app.js` (extrait `CENTRALE_CANINE_BREED_SLUGS` + `CENTRALE_CANINE_BREED_ALIASES`)

**Interfaces:**
- Consumes: tables déjà présentes dans `frontend/app.js`
- Produces: stdout ou fichier `scripts/generated/centrale-canine-fci-files.js` contenant :
  ```js
  var CENTRALE_CANINE_FCI_FILES = {
    "bergerdebeauce": "044",
    "bergeraustralien": "342"
    // clé = clé normalisée (même espace que CENTRALE_CANINE_BREED_SLUGS), valeur = nom de fichier sans .pdf
  };
  ```

- [ ] **Step 1: Vérifier que `pdftotext` est disponible**

```bash
pdftotext -v 2>&1 | head -1
```

Expected: une ligne Poppler / pdftotext (ex. `pdftotext version …`). Si absent : `sudo apt-get install -y poppler-utils`.

- [ ] **Step 2: Créer le script de génération**

Créer `scripts/build-fci-breed-map.mjs` avec ce comportement (code complet à placer dans le fichier) :

```js
#!/usr/bin/env node
/**
 * One-shot : construit CENTRALE_CANINE_FCI_FILES depuis les PDF SCC.
 * Usage: node scripts/build-fci-breed-map.mjs
 * Prérequis: pdftotext (poppler-utils), réseau.
 */
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'fs';
import { spawnSync } from 'child_process';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';

const APP_JS = new URL('../frontend/app.js', import.meta.url);
const OUT_DIR = new URL('./generated/', import.meta.url);
const OUT_FILE = new URL('./generated/centrale-canine-fci-files.js', import.meta.url);
const BASE = 'https://www.centrale-canine.fr/sites/default/files/fci_race';
const MAX_N = 400;

function protectionKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function extractMap(src, varName) {
  const re = new RegExp('var ' + varName + ' = \\{([\\s\\S]*?)\\n  \\};');
  const m = src.match(re);
  if (!m) throw new Error('Map introuvable: ' + varName);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  return out;
}

async function headOk(fileId) {
  const url = `${BASE}/${fileId}.pdf`;
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return res.ok && ct.includes('pdf') ? fileId : null;
}

async function resolveFileId(n) {
  const padded = String(n).padStart(3, '0');
  // Prefer padded when both exist (Beauceron = 044, pas 44).
  return (await headOk(padded)) || (await headOk(String(n)));
}

async function download(fileId, dest) {
  const res = await fetch(`${BASE}/${fileId}.pdf`);
  if (!res.ok) throw new Error('GET ' + fileId + ' -> ' + res.status);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function extractBreedNames(pdfPath) {
  const r = spawnSync('pdftotext', ['-f', '1', '-l', '1', pdfPath, '-'], { encoding: 'utf8' });
  if (r.status !== 0) return { fci: null, names: [] };
  const text = r.stdout || '';
  const fciM = text.match(/Standard[\s-]*FCI\s*N[°oº]?\s*(\d{1,3})/i);
  const fci = fciM ? fciM[1] : null;
  const names = [];
  // Lignes candidates après le n° : nom FR majuscules, éventuellement (English Name)
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^FEDERATION|SECRETARIAT|Standard|Cette illustration|©/i.test(line)) continue;
    if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(line)) continue;
    if (/^_{3,}/.test(line)) continue;
    if (/^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ0-9 '\-]{2,}$/.test(line)) {
      names.push(line);
    }
    const paren = line.match(/^\(([^)]+)\)$/);
    if (paren) names.push(paren[1]);
  }
  return { fci, names };
}

function matchKey(names, slugs, aliases) {
  const slugKeys = new Set(Object.keys(slugs));
  for (const name of names) {
    const k = protectionKey(name);
    if (slugKeys.has(k)) return k;
    if (aliases[k] && slugKeys.has(aliases[k])) return aliases[k];
  }
  // Essai : enlever DEUTSCHER / prefixes courants déjà couverts par aliases manuels plus tard
  return null;
}

const src = readFileSync(APP_JS, 'utf8');
const slugs = extractMap(src, 'CENTRALE_CANINE_BREED_SLUGS');
const aliases = extractMap(src, 'CENTRALE_CANINE_BREED_ALIASES');

const fciFiles = {};
const unmatched = [];
const tmpPdf = join(tmpdir(), 'vetbook-fci.pdf');

for (let n = 1; n <= MAX_N; n++) {
  const fileId = await resolveFileId(n);
  if (!fileId) continue;
  try {
    await download(fileId, tmpPdf);
    const { names } = extractBreedNames(tmpPdf);
    const key = matchKey(names, slugs, aliases);
    if (key) {
      fciFiles[key] = fileId;
      console.error('OK', fileId, '→', key, names[0] || '');
    } else {
      unmatched.push({ fileId, names });
      console.error('NO MATCH', fileId, names.slice(0, 3).join(' | '));
    }
  } catch (e) {
    console.error('ERR', fileId, e.message);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const body = Object.keys(fciFiles)
  .sort()
  .map((k) => `    "${k}":"${fciFiles[k]}"`)
  .join(',\n');
const js = `  // Généré par scripts/build-fci-breed-map.mjs — ne pas éditer à la main.\n  var CENTRALE_CANINE_FCI_FILES = {\n${body}\n  };\n`;
writeFileSync(OUT_FILE, js);
console.log('Wrote', OUT_FILE.pathname, 'entries=', Object.keys(fciFiles).length, 'unmatched=', unmatched.length);
writeFileSync(new URL('./generated/fci-unmatched.json', import.meta.url), JSON.stringify(unmatched, null, 2));
```

- [ ] **Step 3: Exécuter le script**

```bash
node scripts/build-fci-breed-map.mjs
```

Expected: fichier `scripts/generated/centrale-canine-fci-files.js` avec des dizaines/centaines d’entrées ; log `OK 044 → bergerdebeauce` (ou clé équivalente) ; `OK 342 → bergeraustralien`.

- [ ] **Step 4: Contrôler Beauceron et Labrador dans le généré**

```bash
grep -E 'bergerdebeauce|retrieverdulabrador|bergeraustralien' scripts/generated/centrale-canine-fci-files.js
```

Expected: au minimum `bergerdebeauce":"044"` et une entrée Labrador / Berger Australien. Si Beauceron manque : ajouter un alias de nom PDF dans le script (`"BERGER DE BEAUCE"` → déjà dans slugs) et relancer.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-fci-breed-map.mjs scripts/generated/centrale-canine-fci-files.js scripts/generated/fci-unmatched.json
git commit -m "$(cat <<'EOF'
Ajoute le script de génération de la table FCI → PDF SCC.

EOF
)"
```

---

### Task 2: Brancher la résolution URL + libellés dans l’app

**Files:**
- Modify: `frontend/app.js` (après `CENTRALE_CANINE_BREED_ALIASES`, fonctions `centraleCanineBreedSlug` / `centraleCanineBreedUrl`, et `renderIdentity`)
- Test: `scripts/verify-breed-standard-urls.mjs`

**Interfaces:**
- Consumes: `CENTRALE_CANINE_FCI_FILES` (clés = clés normalisées du catalogue), `centraleCanineBreedSlug(race)`, `protectionKey(name)`
- Produces:
  - `centraleCanineBreedKey(race) → string|null` (clé catalogue après alias)
  - `centraleCanineBreedUrl(race) → string|null` (PDF si FCI connu, sinon page race)
  - `centraleCanineBreedLinkMeta(race) → { url, isPdf } | null`

- [ ] **Step 1: Écrire le script de vérification (fail avant implémentation complète)**

Créer `scripts/verify-breed-standard-urls.mjs` :

```js
#!/usr/bin/env node
/**
 * Vérifie hors navigateur la résolution des URL standard de race.
 * Extrait / évalue les helpers depuis frontend/app.js via un harness minimal.
 */
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import vm from 'vm';

const src = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');

// Harness : on ne charge pas tout app.js (DOM). On extrait le bloc tables + helpers.
function extract(re) {
  const m = src.match(re);
  if (!m) throw new Error('bloc introuvable: ' + re);
  return m[0];
}

const tables = [
  extract(/var CENTRALE_CANINE_BREED_SLUGS = \{[\s\S]*?\n  \};/),
  extract(/var CENTRALE_CANINE_BREED_ALIASES = \{[\s\S]*?\n  \};/),
  extract(/var CENTRALE_CANINE_FCI_FILES = \{[\s\S]*?\n  \};/),
].join('\n');

const helpers = `
function protectionKey(name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}
function centraleCanineBreedKey(race) {
  if (!race) return null;
  var key = protectionKey(race);
  if (CENTRALE_CANINE_BREED_SLUGS[key]) return key;
  var alias = CENTRALE_CANINE_BREED_ALIASES[key];
  return alias && CENTRALE_CANINE_BREED_SLUGS[alias] ? alias : null;
}
function centraleCanineBreedSlug(race) {
  var key = centraleCanineBreedKey(race);
  return key ? CENTRALE_CANINE_BREED_SLUGS[key] : null;
}
function centraleCanineBreedLinkMeta(race) {
  var key = centraleCanineBreedKey(race);
  if (!key) return null;
  var fileId = CENTRALE_CANINE_FCI_FILES[key];
  if (fileId) {
    return { url: 'https://www.centrale-canine.fr/sites/default/files/fci_race/' + fileId + '.pdf', isPdf: true };
  }
  var slug = CENTRALE_CANINE_BREED_SLUGS[key];
  return slug
    ? { url: 'https://www.centrale-canine.fr/le-chien-de-race/' + slug, isPdf: false }
    : null;
}
function centraleCanineBreedUrl(race) {
  var m = centraleCanineBreedLinkMeta(race);
  return m ? m.url : null;
}
`;

const sandbox = {};
vm.runInNewContext(tables + '\n' + helpers, sandbox);

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const beauce = sandbox.centraleCanineBreedLinkMeta('Beauceron');
assert(beauce && beauce.isPdf, 'Beauceron → PDF');
assert(beauce.url.endsWith('/fci_race/044.pdf'), 'Beauceron → …/044.pdf, got ' + (beauce && beauce.url));

const lab = sandbox.centraleCanineBreedLinkMeta('Labrador Retriever');
assert(lab && lab.isPdf, 'Labrador Retriever → PDF');
assert(/\/fci_race\/\d+\.pdf$/.test(lab.url), 'Labrador URL PDF, got ' + (lab && lab.url));

const unknown = sandbox.centraleCanineBreedLinkMeta('Chien Imaginaire XYZ');
assert(unknown === null, 'race inconnue → null');

console.log('All checks passed.');
```

- [ ] **Step 2: Lancer la vérif — doit échouer (table FCI absente de app.js)**

```bash
node scripts/verify-breed-standard-urls.mjs
```

Expected: FAIL `bloc introuvable` pour `CENTRALE_CANINE_FCI_FILES` (ou erreur équivalente).

- [ ] **Step 3: Insérer la table générée dans `frontend/app.js`**

Juste après `CENTRALE_CANINE_BREED_ALIASES = { … };`, coller le contenu de `scripts/generated/centrale-canine-fci-files.js` (le `var CENTRALE_CANINE_FCI_FILES = { … };`).

- [ ] **Step 4: Remplacer les helpers de résolution**

Remplacer le bloc actuel `centraleCanineBreedSlug` / `centraleCanineBreedUrl` par :

```js
  function centraleCanineBreedKey(race) {
    if (!race) return null;
    var key = protectionKey(race);
    if (CENTRALE_CANINE_BREED_SLUGS[key]) return key;
    var alias = CENTRALE_CANINE_BREED_ALIASES[key];
    return alias && CENTRALE_CANINE_BREED_SLUGS[alias] ? alias : null;
  }
  function centraleCanineBreedSlug(race) {
    var key = centraleCanineBreedKey(race);
    return key ? CENTRALE_CANINE_BREED_SLUGS[key] : null;
  }
  function centraleCanineBreedLinkMeta(race) {
    var key = centraleCanineBreedKey(race);
    if (!key) return null;
    var fileId = CENTRALE_CANINE_FCI_FILES[key];
    if (fileId) {
      return {
        url: 'https://www.centrale-canine.fr/sites/default/files/fci_race/' + fileId + '.pdf',
        isPdf: true
      };
    }
    var slug = CENTRALE_CANINE_BREED_SLUGS[key];
    return slug
      ? { url: 'https://www.centrale-canine.fr/le-chien-de-race/' + slug, isPdf: false }
      : null;
  }
  function centraleCanineBreedUrl(race) {
    var meta = centraleCanineBreedLinkMeta(race);
    return meta ? meta.url : null;
  }
```

- [ ] **Step 5: Mettre à jour `renderIdentity` pour le libellé PDF vs page**

Dans `renderIdentity`, remplacer l’usage de `breedUrl` seul par :

```js
    var breedLink = centraleCanineBreedLinkMeta(a.race);
    // …
      (breedLink
        ? '<a class="care-action identity-breed-link" href="' + breedLink.url + '" target="_blank" rel="noopener">' +
            ico(breedLink.isPdf ? 'download' : 'fileText', 16) +
            '<span>' + (breedLink.isPdf ? 'Standard de la race (PDF)' : 'Standard de la race') + '</span></a>'
        : '');
```

- [ ] **Step 6: Relancer la vérif — doit passer**

```bash
node scripts/verify-breed-standard-urls.mjs
```

Expected: `All checks passed.` avec les trois `OK:`.

- [ ] **Step 7: Smoke HTTP sur les URL résolues**

```bash
node -e '
import { spawnSync } from "child_process";
const r = spawnSync("node", ["scripts/verify-breed-standard-urls.mjs"], { encoding: "utf8" });
console.log(r.stdout);
' 
# Contrôle manuel des PDF :
curl -sI "https://www.centrale-canine.fr/sites/default/files/fci_race/044.pdf" | head -3
curl -sI "https://www.centrale-canine.fr/sites/default/files/fci_race/342.pdf" | head -3
```

Expected: `HTTP/2 200` et `content-type: application/pdf` pour les deux.

- [ ] **Step 8: Commit**

```bash
git add frontend/app.js scripts/verify-breed-standard-urls.mjs
git commit -m "$(cat <<'EOF'
Ouvre le standard de race en PDF quand le n° FCI est connu.

EOF
)"
```

---

### Task 3: Compléter les matchs manuels + re-générer si besoin

**Files:**
- Modify: `frontend/app.js` (`CENTRALE_CANINE_BREED_ALIASES` et/ou entrées manuelles dans `CENTRALE_CANINE_FCI_FILES` pour les unmatched importants)
- Modify: `scripts/build-fci-breed-map.mjs` (table de synonymes PDF → clé si nécessaire)
- Read: `scripts/generated/fci-unmatched.json`

**Interfaces:**
- Consumes: liste `unmatched` du Task 1
- Produces: couverture améliorée ; `verify-breed-standard-urls.mjs` toujours vert

- [ ] **Step 1: Inspecter les non-matchs**

```bash
node -e 'const u=require("./scripts/generated/fci-unmatched.json"); console.log("unmatched", u.length); console.log(u.slice(0,25));'
```

- [ ] **Step 2: Ajouter des synonymes ciblés pour les races de `BREED_DB` encore sans PDF**

Pour chaque race fréquente de `BREED_DB` (Labrador, Golden, Berger Allemand, …) absente de `CENTRALE_CANINE_FCI_FILES` :

1. Trouver le `fileId` dans `fci-unmatched.json` via le nom PDF.
2. Soit ajouter un alias `protectionKey(nomUsuel) → cléCatalogue` dans `CENTRALE_CANINE_BREED_ALIASES`, soit ajouter directement `"cleCatalogue":"fileId"` dans `CENTRALE_CANINE_FCI_FILES`.

Exemple si le PDF dit `RETRIEVER DU LABRADOR` mais la clé catalogue est déjà `retrieverdulabrador` : rien à faire côté alias ; si le script n’a pas matché, corriger `extractBreedNames` / `matchKey` et relancer Task 1 Step 3.

- [ ] **Step 3: Étendre le script de vérif avec 3 races `BREED_DB`**

Ajouter dans `scripts/verify-breed-standard-urls.mjs` :

```js
for (const name of ['Berger Allemand', 'Golden Retriever', 'Bouledogue Français']) {
  const m = sandbox.centraleCanineBreedLinkMeta(name);
  assert(m && m.url, name + ' a un lien');
}
```

- [ ] **Step 4: Relancer vérif + commit**

```bash
node scripts/verify-breed-standard-urls.mjs
git add frontend/app.js scripts/verify-breed-standard-urls.mjs scripts/build-fci-breed-map.mjs scripts/generated/
git commit -m "$(cat <<'EOF'
Étend la couverture des PDF standards pour les races courantes.

EOF
)"
```

---

## Self-Review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Table locale n°/fichier FCI versionnée | Task 1 |
| URL PDF SCC directe | Task 2 |
| Repli page race | Task 2 (`centraleCanineBreedLinkMeta`) |
| Libellé PDF vs page | Task 2 Step 5 |
| Alias avant résolution | Task 2 (`centraleCanineBreedKey`) |
| Beauceron → PDF, Labrador → PDF, inconnu → null | Task 2 vérif + Task 3 |
| Pas d’IA / scrape runtime | Global + Task 1 one-shot only |
| Padding `044` vs `44` | Task 1 `resolveFileId` |

Pas de TBD / placeholder restant dans les steps.
