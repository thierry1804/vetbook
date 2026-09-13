# Revue des maquettes Stitch

Référence : les 14 captures et leurs fichiers HTML dans `design/stitch_vetbook_ui_redesign`, avec les tokens de `design/DESIGN.md`. Revue guidée par le skill Impeccable local ; son moteur automatique n'est pas installé.

| Capture | Ajustements de l’interface |
| --- | --- |
| Tableau de bord desktop | Données réelles, cartes de suivi, courbe et accès aux conseils/événements. |
| Tableau de bord mobile | Compagnons en premier, actions rapides, suppression du bandeau redondant. |
| Fiche animal / identité | Identification, registre, naissance, propriétaire et QR d’identité désormais visibles ; accès sauvegardes. |
| Carnet de santé / soins | Synthèse des rappels, onglets regroupés par domaine et cartes de soins avec dates lisibles. |
| Consultations / budget | Budget des 12 derniers mois avant l’historique ; comptes rendus et coûts mis en valeur. |
| Nutrition / activités | Navigation liée, apport du jour, plan nutritionnel et repas en cartes modifiables. |
| Chaleurs / reproduction | Projection existante explicitée et historique chronologique en cartes avec observations. |
| Urgences vétérinaires | Appel 3115, contacts d’urgence et cliniques hiérarchisés. |
| Album photo desktop | Ajout visible, grille de photos et panneau d’informations ; légendes, export et accès identité. |
| Événements desktop | Actualité du mois, recherche, liste datée et panneau agenda. |
| Événements / conseils mobile | Navigation commune et adaptation en colonne unique. |
| Astuces / centre d’aide | Recherche textuelle, filtre de catégorie, grille de conseils et FAQ harmonisée. |
| Profil utilisateur / paramètres | Organisation revue au passage précédent conservée ; états de navigation harmonisés. |
| Ajout animal mobile | Feuille de saisie avec photo, puce, stérilisation et informations de base persistées. |

Les exemples de personnes, animaux, photos, horaires et dépenses des maquettes ne sont pas injectés dans les données de l’application. Les éléments nécessitant des fonctionnalités absentes (remboursements mutuelle, scanner OCR, album clinique catégorisé, certification, QR public connecté, inscription à des événements, fenêtre fertile médicale) ne sont pas simulés. Le QR existant contient du texte d’identité et des coordonnées, ce que l’interface indique.

Validation : captures de 17 routes à 1440 et 390 px, création d’un compagnon avec puce et stérilisation, QR, recherche conseils/événements, compilation et lint. Les données de démonstration restent dans le profil Chrome de test isolé.
