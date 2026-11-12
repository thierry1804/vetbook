# Migrations versionnées

`schema.sql` et `admin.sql` restent le **socle idempotent** (réappliqué à chaque démarrage) : on y ajoute des
`create table if not exists` et des `alter table … add column if not exists`.

Tout changement qui n'est **pas** rejouable sans risque va ici, dans un fichier `NNNN_description.sql` :
renommer ou supprimer une colonne ou une table, changer un type, convertir ou remplir des données, supprimer
une contrainte. Chaque fichier :

- s'applique **une seule fois**, dans l'ordre des numéros, dans **une transaction** (en cas d'erreur, rien n'est
  appliqué et l'API ne démarre pas) ;
- est enregistré dans `schema_migrations` avec une somme de contrôle : le modifier après coup est refusé,
  on écrit une nouvelle migration ;
- ne doit pas supposer l'état « un seul serveur » : un verrou empêche deux API d'en appliquer une en même temps.

Pas de retour arrière automatique : pour défaire, écrire la migration inverse, et sauvegarder avant
(`scripts/backup.sh`, voir docs/RUNBOOK.md). Un renommage en production se fait en deux déploiements
(ajouter et copier, puis supprimer l'ancien) pour que l'ancienne version de l'API continue de fonctionner.
