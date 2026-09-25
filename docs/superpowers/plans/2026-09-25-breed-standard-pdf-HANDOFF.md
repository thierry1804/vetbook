# Handoff — Lien PDF standard de race

**Date :** 2026-09-25  
**Branche :** `feature/breed-standard-pdf`  
**Plan :** [`docs/superpowers/plans/2026-09-25-breed-standard-pdf.md`](./2026-09-25-breed-standard-pdf.md)  
**Spec :** [`docs/superpowers/specs/2026-09-25-breed-standard-pdf-design.md`](../specs/2026-09-25-breed-standard-pdf-design.md)

Relancer avec : *« continue le plan breed-standard-pdf (handoff) »* + skill `executing-plans` (option inline) ou `subagent-driven-development`.

---

## Déjà fait

### Commits (sur la branche / master d’origine)

- Spec design : `docs/superpowers/specs/2026-09-25-breed-standard-pdf-design.md`
- Plan d’implémentation : `docs/superpowers/plans/2026-09-25-breed-standard-pdf.md`

### WIP non commité (à garder)

| Fichier | État |
|---------|------|
| `frontend/app.js` | Alias races (`Beauceron`→`bergerdebeauce`, Labrador, etc.) ; `centraleCanineBreedSlug` ; UI identité avec `identity-passport__actions` + lien « Standard de la race (PDF) » mais **encore vers la page race**, pas le PDF |
| `frontend/styles.css` | Alignement boutons fiche + `.identity-breed-link` |
| `frontend/index.html` | Modifs locales (hors scope PDF, ne pas perdre) |
| `scripts/build-fci-breed-map.mjs` | Script one-shot (réseau SCC lent / timeouts) — **à remplacer / compléter** |
| `scripts/generated/centrale-canine-fci-files.js` | **Incomplet** (~9 entrées, checkpoint partiel) ; contient déjà `bergerdebeauce":"044"` |
| `scripts/generated/fci-unmatched.json` | Snapshot partiel du scrape SCC |
| `scripts/generated/wikidata-fci-p528.json` | **310 races FCI** via Wikidata `P528`+`P972=Q38603` — **meilleure source pour finir** |

### Découvertes techniques (ne pas re-explorer)

- URL PDF SCC : `https://www.centrale-canine.fr/sites/default/files/fci_race/<id>.pdf`
- **Padding obligatoire** pour certains n° : Beauceron = **`044.pdf`** (`44.pdf` → 404)
- Vérifié 200 : `044`, `122` (Labrador), `342` (Berger Australien), `166`, `186`, `001`, `015`
- Attention : le n° affiché sur une page SCC n’est pas toujours celui qu’on croit (ex. 342 = Berger Australien FCI, pas Beauceron)
- Scrape live des pages SCC = Cloudflare ; scrape massif des PDF = trop lent / timeouts
- Les alias dans `app.js` sont en **clés non quotées** (`labrador: '…'`) → un extracteur regex `"key":"value"` **rate les alias**

---

## Actions restantes (ordre)

### 1. Générer la table complète `CENTRALE_CANINE_FCI_FILES`

**Ne pas** relancer un download 1→400 des PDF SCC en série.

À la place :

1. Lire `scripts/generated/wikidata-fci-p528.json` (déjà dans le repo).
2. Pour chaque entrée : labels FR/EN → `protectionKey` → match `CENTRALE_CANINE_BREED_SLUGS` **et** `CENTRALE_CANINE_BREED_ALIASES` (parser les deux formats de guillemets).
3. Ajouter une table `EXTRA` de synonymes Wikidata→clé catalogue (Beauceron, Labrador, Berger belge, Papillon, Braque allemand, etc. — ébauche dans le transcript de session).
4. `fileId = fci.zfill(3)` (ex. `"44"` → `"044"`).
5. Écrire `scripts/generated/centrale-canine-fci-files.js`.
6. Optionnel : HEAD spot-check sur 20 PDF ; pas besoin de tout re-télécharger.

**Cible :** ≥200–250 matchs sur ~390 slugs ; le reste garde le lien page.

### 2. Brancher dans `frontend/app.js` (Task 2 du plan)

1. Coller `CENTRALE_CANINE_FCI_FILES` après `CENTRALE_CANINE_BREED_ALIASES`.
2. Remplacer les helpers par :
   - `centraleCanineBreedKey(race)`
   - `centraleCanineBreedSlug(race)`
   - `centraleCanineBreedLinkMeta(race)` → `{ url, isPdf }`
   - `centraleCanineBreedUrl(race)`
3. Dans `renderIdentity` : libellé `(PDF)` **seulement** si `isPdf`, icône `download` vs `fileText`.
4. Créer `scripts/verify-breed-standard-urls.mjs` (copie du plan) et faire passer :
   - `Beauceron` → `…/fci_race/044.pdf`
   - `Labrador Retriever` → PDF
   - race inconnue → `null`

### 3. Couverture races courantes (Task 3)

- Inspecter unmatched ; compléter alias / EXTRA pour `BREED_DB` (Berger Allemand, Golden, Bouledogue Français…).
- Étendre le script de vérif.
- Commit.

### 4. Finir la branche

- Commits suggérés (messages FR du plan) :
  1. script + `scripts/generated/*`
  2. branchement `app.js` + verify
  3. couverture / polish
- Inclure aussi le WIP UI (alignement boutons) dans un commit dédié ou le même.
- Puis `finishing-a-development-branch` : merge / PR / reste sur branche.

---

## Commandes de reprise rapides

```bash
cd /home/etech/Documents/vetbook
git checkout feature/breed-standard-pdf
git status

# Wikidata déjà là :
python3 -c "import json; print(len(json.load(open('scripts/generated/wikidata-fci-p528.json'))['results']['bindings']))"

# Après génération + branchement :
node scripts/verify-breed-standard-urls.mjs
curl -sI 'https://www.centrale-canine.fr/sites/default/files/fci_race/044.pdf' | head -3
```

---

## Hors scope (ne pas rouvrir)

- IA / scrape live au runtime
- Afficheur PDF intégré
- Proxy backend

---

## Checklist reprise

- [ ] Régénérer `centrale-canine-fci-files.js` depuis Wikidata (+ alias parser correct)
- [ ] Vérifier `bergerdebeauce=044`, `retrieverdulabrador=122`, `bergeraustralien=342`
- [ ] Insérer table + helpers dans `app.js`
- [ ] Libellés PDF vs page dans `renderIdentity`
- [ ] `scripts/verify-breed-standard-urls.mjs` vert
- [ ] Alias BREED_DB manquants
- [ ] Commits + fin de branche
