# SDD ledger — plan: docs/superpowers/plans/2026-11-12-lecture-carnet-photo.md
Setup: branche feature/lecture-carnet-photo dans le dépôt principal (pas de worktree séparé : la stack Docker de test tourne depuis ce checkout). Spec : docs/superpowers/specs/2026-11-12-lecture-carnet-photo-design.md.
Pre-flight T1→T2 : normalizeBookletResult/extractJson/bookletPrompt produits en T1, consommés en T2 ; Entry.nextEstimated posé à false en T1, à true par estimateReminders en T2 — cohérent.
Pre-flight T2→T3 : getAiConfig().visionModel + DEFAULT_VISION_MODEL produits en T2, consommés en T3 — cohérent.
Pre-flight T2→T4 : réponse { petName, chip, mismatch, entries } + codes 402/413/415/422/502/503 produits en T2, consommés en T4 — cohérent ; petLocalId = pets.local_id = id local de l'animal côté front (wrap.id) — cohérent avec sync/push.
Task 1: Ruling: parseBookletDate(raw) sans paramètre today (inutilisé ; la date future est contrôlée dans normalizeEntry) — évite une erreur de lint — coût si faux : réajouter un paramètre.
Task 1: complete (tests: npm run test:fast → > tsc --noEmit)
Task 2: Ruling: contrainte check de ai_usage_log.source élargie à 'booklet' (drop/add idempotent dans admin.sql) — le plan ne l'avait pas vue, l'insertion aurait échoué — coût si faux : aucun (contrainte plus large).
Task 2: Ruling: contrôle IA (503) avant contrôle de l'animal (404), et erreur multer inattendue → 400 au lieu d'une relance — évite une requête pendante sous Express 4 — coût si faux : ordre des messages d'erreur.
Task 2: Ruling: DEFAULT_VISION_MODEL = 'google/gemini-2.5-flash' — multimodal, bon en manuscrit, peu cher ; identifiant à confirmer par un vrai appel en tâche 5 — coût si faux : changer le réglage dans le backoffice.
Task 2: Ruling: test « payant » via entitlement_overrides plutôt qu'une souscription — guardPaidFeature honore la dérogation, test plus court — coût si faux : chemin souscription non couvert ici (déjà couvert par l'assistant).
Task 2: complete (tests: npm run test:integration → 10 fichier(s) de test d'intégration au vert.)
Task 3: Ruling: le bouton « Tester la lecture d'image » (appel réseau réel) n'a pas de test automatisé — fetch non injectable sans changer l'API admin ; vérifié à la main en tâche 5 — coût si faux : un bouton de diagnostic cassé en backoffice.
Task 3: complete (tests: npm run test:integration -- booklet-scan → 1 fichier(s) de test d'intégration au vert.)
Task 4: Ruling: la modale s'ouvre d'abord sur un écran « Prendre la photo » (mention de confidentialité avant tout envoi) au lieu d'ouvrir l'appareil photo dès le bouton de l'onglet — la spec veut la mention visible avant l'envoi — coût si faux : un appui de plus.
Task 4: Ruling: le smoke ouvre la fiche via un clic programmatique sur [data-nav="pets"] (pas de barre du bas en bureau) — préparation du test, pas le comportement testé — coût si faux : aucun.
Task 4: Ruling: une ligne cochée dont la date n'est pas une date ISO, ou un poids hors bornes, bloque l'enregistrement avec un toast — pas d'enregistrement d'une date illisible — coût si faux : l'utilisateur doit corriger ou décocher.
Task 4: Observation: npm run test:e2e a échoué une fois (étape « second appareil », délai dépassé) juste après docker compose up --build, puis 4/4 au vert ; cause non établie — à examiner en relecture finale.
Task 4: complete (tests: npm run test:front → OK mismatch affiche l’avertissement)
Task 5: Ruling: étapes 1-3 (vraies photos, vrai modèle, agent recette-navigateur) non faites — aucune clé OpenRouter configurée en local ni photo de carnet disponible ; spec marquée « vérification réelle en attente » plutôt que « livré » — coût si faux : le modèle par défaut ou le prompt peuvent mal lire de vrais carnets, à découvrir à la vérification.
Final review: fait par un relecteur indépendant — 0 critique, 5 importants, 11 mineurs ; passe de corrections reportée au lendemain à la demande du propriétaire (détail dans docs/REPRISE.md, section 4).
