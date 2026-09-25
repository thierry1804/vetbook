# Design — Lien direct vers le standard de race (PDF)

Date : 2026-09-25  
Statut : validé en principe (table FCI locale), en attente de revue de cette spec

## Problème

Sur la fiche identité, le lien « Standard de la race » pointait vers la page SCC (`/le-chien-de-race/<slug>`), pas vers le PDF. Le PDF exige le numéro FCI (`/sites/default/files/fci_race/<n>.pdf`), absent du catalogue nom→slug. Une recherche IA à l’exécution est rejetée : catalogue fini (~390 races), pages SCC protégées Cloudflare, URL PDF déjà prévisible.

## Objectif

Un clic ouvre (ou télécharge) le PDF officiel du standard quand le n° FCI est connu. Sinon, repli sur la page race.

## Approche retenue

Enrichir une fois pour toutes une table locale versionnée : clé de race normalisée → slug SCC + n° FCI.

Rejetées :

- IA / scrape live : fragile, coûteux, inutile sur un catalogue fixe.
- Lien page seule : conserve un clic de trop.

## Données

- Source cible des PDF : `https://www.centrale-canine.fr/sites/default/files/fci_race/<n>.pdf` (HTTP 200, `application/pdf` vérifié pour plusieurs n°, ex. 342 Beauceron).
- Table existante : `CENTRALE_CANINE_BREED_SLUGS` + `CENTRALE_CANINE_BREED_ALIASES` dans `frontend/app.js`.
- Extension : map parallèle `CENTRALE_CANINE_FCI_NUMBERS` (même clé normalisée / via alias → entier FCI), ou objet `{ slug, fci }` si plus lisible à la génération.
- Génération : script one-shot (hors runtime app) qui croise le catalogue SCC / listes FCI publiques et écrit le fragment JS ; le résultat est commité. Pas d’appel réseau au chargement de la fiche.
- Couverture : viser l’ensemble des slugs déjà listés ; les races sans n° FCI connu gardent le lien page.

## Comportement UI

- Emplacement : sous « Compléter sa fiche » + crayon pedigree (groupe déjà aligné).
- Libellé : « Standard de la race (PDF) » quand l’URL est un PDF ; sinon « Standard de la race » vers la page.
- Ouverture : `target="_blank"` + `rel="noopener"`.
- Absence de race ou de match : pas de lien (comportement actuel).

## API / résolution

```
centraleCanineBreedUrl(race) →
  si fci connu → URL PDF
  sinon si slug connu → URL page race
  sinon → null
```

Les alias (`Beauceron` → `bergerdebeauce`, etc.) s’appliquent avant la résolution FCI/slug.

## Hors scope

- Afficheur PDF intégré à l’app
- Cache ou proxy backend
- Mise à jour automatique périodique des n° FCI
- Chats / races non LOF-SCC

## Critères de succès

- Beauceron / Berger de Beauce → PDF n°342 en un clic
- Labrador Retriever (alias) → PDF du Retriever du Labrador
- Race inconnue du catalogue → pas de lien cassé
- Pas de dépendance réseau ni d’IA au rendu de la fiche

## Risques

- Quelques n° FCI manquants ou obsolètes après refonte SCC → repli page race.
- PDF hébergé chez SCC : indisponibilité externe hors de notre contrôle.
