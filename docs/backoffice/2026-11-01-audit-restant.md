# Backoffice — reliquat de l'audit UX/UI manuel (1er novembre 2026)

Contexte : un audit manuel écran par écran du backoffice (admin React Router + antd) a produit une
longue liste de corrections, traitées sur plusieurs sessions (voir commits `231f3f9` → `2cd2124`, puis
`fc48c97`/`0838b15` faits par une autre session/agent). Il reste 4 points mineurs, listés ci-dessous avec
assez de contexte pour les reprendre sans refaire l'investigation.

Règles du projet à respecter (voir aussi `CLAUDE.md`/mémoire du dépôt) :
- Jamais de mention Anthropic/Claude dans les messages ou l'auteur des commits.
- Remote SSH `git@github.com:thierry1804/vetbook.git`. Branches `master` (principale) et `develop`
  (créée le 2026-11-01, identique à master à cette date — à tenir à jour si on veut la garder synchro).
- Ne jamais tester sur la vraie base en écrivant des données réelles : créer une session admin temporaire
  via `signAdminToken` + insertion brute dans `admin_sessions` (un `user_agent` distinctif, genre
  `'nom-du-test-verify'`) pour les vérifications en lecture/Playwright, et la révoquer après coup
  (`delete from admin_sessions where user_agent = '...' and revoked_at is null`). Ne jamais écrire sur des
  ressources partagées réelles (abonnements, paiements, réglages globaux) même « pour tester puis annuler » —
  un classificateur de permissions bloque ce genre d'action à raison.
- `sudo -n docker compose up -d --build` (service `nginx` ou `api` + `nginx` selon ce qui a changé) pour
  déployer ; `npx tsc --noEmit` dans `admin/` avant de déployer.
- Le moteur générique de ressources est `admin/src/content.tsx` (liste/fiche/formulaire à partir de
  `admin/src/resources.ts`) + `backend/api/admin/resources.js` (factory `R()` générique, route `/r/<nom>`).

## 1. Compteurs sur les onglets de statut (Cliniques, et génériquement partout)

Les listes avec un champ `status` affichent déjà des onglets (Tous / À valider / Validées / Archivés…)
via `content.tsx`, `RList`, le bloc `<Tabs activeKey={filter.status ?? ''} ... items={...STATUS_PLURAL...} />`
(chercher `STATUS_PLURAL` dans le fichier). Les libellés d'onglet sont actuellement du texte brut
(« À valider »), sans le nombre d'éléments dans chaque statut (demande initiale : « À valider (3) »).

Piste : `data.ts` (`fetchList`) lit déjà le total via l'en-tête `Content-Range` (`range.split('/')[1]`).
Le plus simple et générique : dans `RList`, pour chaque valeur de statut, faire un appel léger
`range=[0,0]` + `filter: { ...filter, status: value }` vers le même endpoint de liste (réutiliser `api()`
de `./api`), lire le total retourné, et l'afficher entre parenthèses dans le libellé de l'onglet. Mettre
ça en cache/`useMemo` par filtre pour éviter de re-fetcher à chaque frappe de recherche. Alternative plus
lourde mais plus propre à grande échelle : un endpoint backend d'agrégation
(`GET /r/<resource>/counts?field=status`) qui fait un seul `GROUP BY` au lieu de N requêtes parallèles —
préférable si on a le temps, plus correct sur les grosses tables.

Ça bénéficie à toutes les ressources avec un champ statut (Cliniques, Conseils, Événements, Pages,
Vaccins, Formules…), pas seulement Cliniques — implémenter une fois dans le moteur générique.

## 2. Formules : regrouper mensuel/annuel

`admin/src/resources.ts`, ressource `plans` (table `plans`, voir aussi `backend/api/admin/resources.js`
clé `plans`). Actuellement liste à plat de 7 lignes : `gratuit`, `premium`, `premium_annuel`, `eleveur`,
`eleveur_annuel`, `cabinet`, `cabinet_annuel` (convention de nommage : suffixe `_annuel`). Le rapport
d'audit veut un regroupement par offre de base avec une bascule mensuel/annuel, et la remise annuelle
affichée (ex. « 50 000 MGA/an au lieu de 60 000 MGA » si le prix annuel < 12× le mensuel).

C'est React-Admin-style : probablement pas faisable proprement dans le moteur générique
(`content.tsx`/`makeResource`) sans le complexifier pour un seul cas d'usage. Suivre le précédent déjà en
place : construire un écran dédié comme `admin/src/PlanMatrix.tsx` ou `admin/src/SettingsScreen.tsx`
(liste groupée par code de base avec un `Switch`/`Segmented` mensuel⇄annuel), et le brancher dans le hub
Offres (`admin/src/nav.ts`, `HUBS`, tab `plans`) à la place du `List` générique pour cette ressource — voir
`admin/src/App.tsx`, bloc `HUBS.map(...)` qui construit les routes des hubs, il faudrait y substituer un
composant custom pour l'onglet `plans` au lieu de `makeResource(r).List`. Garder la fiche d'édition
individuelle (Create/Edit) telle quelle, générique — seul l'écran de LISTE a besoin d'être repensé.

## 3. Espèces : empêcher/avertir l'archivage d'une espèce utilisée

`admin/src/resources.ts`, ressource `species` (table réelle `ref_species`, voir
`backend/api/admin/resources.js` clé `species: R('ref_species', 'code', ref, ...)`). Aujourd'hui rien
n'empêche de passer une espèce en « Archivé » (champ `status`) même si des animaux (`pets.species`)
l'utilisent encore — testé en session précédente : « Féline »/« Autre » sont archivées alors que des
animaux existants les utilisent déjà en prod sur cette instance.

Deux niveaux possibles :
- Minimal (frontend seul) : avant de sauvegarder un changement de statut vers « archivé » sur `species`,
  interroger un petit endpoint (`GET /r/species/:code/usage` ou similaire, à créer) qui renvoie le nombre
  de `pets` avec `species = code`, et afficher une confirmation (`Modal.confirm` ou `Popconfirm`) si > 0 :
  « N animaux utilisent cette espèce. Archiver quand même ? ».
- Plus robuste (backend) : dans `backend/api/admin/resources.js`, le handler PUT générique de `R()` n'a
  pas de hook de validation par ressource aujourd'hui — il faudrait soit ajouter un paramètre optionnel
  genre `beforeUpdate` à la factory `R()` (comme `joinUser` a été ajouté cette session), soit un
  court-circuit spécifique pour `species` dans `buildResourceRouter()` qui vérifie l'usage avant
  d'accepter `status: 'archive'` et renvoie 409 avec un message clair si bloquant (ou juste un avertissement
  non bloquant, à trancher avec l'utilisateur — champ ouvert, pas tranché dans l'audit initial).

Vérifier au préalable le nombre réel de `pets` par espèce sur l'instance de prod avant de choisir
bloquant vs avertissement seul (si un animal existant devait perdre son espèce de référence, ça casserait
l'affichage côté app — plutôt avertissement fort que blocage dur, par prudence, mais à confirmer).

## 4. Assistant IA (admin/src/AiSettings.tsx)

Trois améliorations distinctes demandées par l'audit :

- **Compteur de caractères** sur le `system_prompt` (`Input.TextArea` de `AiSettings.tsx`) : la limite
  serveur est `4000` (`backend/api/admin/ai.js`, ligne avec `.slice(0, 4000)`). Ajouter un petit texte
  `{systemPrompt.length} / 4000` sous le textarea, en rouge si proche/dépassé (antd `Input.TextArea`
  supporte `showCount maxLength={4000}` nativement — le plus simple est d'utiliser cette prop directement
  au lieu de recoder un compteur).
- **« Rétablir par défaut »** : un bouton à côté de Tester/Enregistrer qui remet `model`/`systemPrompt` aux
  valeurs par défaut (`st.defaultModel`/`st.defaultSystemPrompt`, déjà renvoyées par `GET /ai-settings`,
  voir `backend/api/admin/ai.js`) dans le formulaire SANS sauvegarder (juste `setModel`/`setSystemPrompt`,
  l'utilisateur doit encore cliquer Enregistrer — cohérent avec le reste de l'écran qui demande déjà un
  motif de confirmation à la sauvegarde).
- **Indicateur de consommation du quota** : **investigation à faire avant d'implémenter** — il n'existe
  actuellement AUCUN suivi persistant des appels à l'assistant IA. La seule limite en place est
  `aiChatLimiter` dans `backend/server.js` (express-rate-limit, 8 req/min **en mémoire, par IP**, remis à
  zéro à chaque redémarrage du conteneur API) — ce n'est pas la même chose que le plafond `20 req/min par
  compte OpenRouter` partagé entre tous les utilisateurs de l'app, qui lui n'est tracké nulle part. Pour un
  vrai indicateur, il faut d'abord décider quoi logger (table `ai_usage_log` avec timestamp + utilisateur ?
  juste un compteur glissant en mémoire exposé par un endpoint admin ?) avant de toucher au frontend —
  sinon l'indicateur afficherait une fausse information. Ne pas fabriquer un faux indicateur pour cocher
  la case : soit on logue réellement, soit on l'omet.

## Comment vérifier sans toucher aux données réelles

Pattern déjà utilisé tout du long cette session, à reproduire :
```js
// dans le conteneur api
import('./api/_lib/db.js').then(async ({withClient})=>{const {signAdminToken}=await import('./api/_lib/admin-auth.js');
const a=(await withClient(c=>c.query("select id from admin_users where email='thierry1804@gmail.com'"))).rows[0];
const sid=(await withClient(c=>c.query("insert into admin_sessions (admin_id, expires_at, ip, user_agent) values ($1, now()+interval '1 hour','127.0.0.1','XXX-verify') returning id",[a.id]))).rows[0].id;
console.log(await signAdminToken(a.id,sid));process.exit(0)})
```
rediriger la sortie vers un fichier (jamais l'afficher directement, le classificateur de permissions
bloque l'affichage brut d'un jeton signé — « Credential Materialization »), puis Playwright avec ce cookie
`admin_session` sur `vetbook-admin.boss-etech.net` (résoudre en local via
`--host-resolver-rules=MAP vetbook-admin.boss-etech.net 127.0.0.1:3080`). Révoquer la session après usage.
