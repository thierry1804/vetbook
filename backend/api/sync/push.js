// POST /api/sync/push  { state, vetDirectory }
// Remplace les ~15 upserts `client.from(table)...` que faisait auparavant
// data-layer.js directement via supabase-js. Le mapping (toRow/fromRow,
// tables de correspondance) est le même, simplement déplacé côté serveur.
// user_id vient toujours du JWT vérifié, jamais du payload.
import { withTransaction } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import {
  ANIMAL_FIELDS, OWNER_FIELDS, PEDIGREE_FIELDS, NUTRITION_PLAN_FIELDS, NOTIF_FIELDS,
  MEAL_FIELDS, CHILD_ARRAYS, VET_CONTACT_FIELDS, toRow, upsertRows, upsertOne,
} from '../_lib/mapping.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const state = body.state;
  const vetDirectory = body.vetDirectory;
  const hasAnimals = Array.isArray(state && state.animals) && state.animals.length > 0;
  const hasOwner = !!(state && state.owner && Object.values(state.owner).some((v) => v));
  if (!state || (!hasAnimals && !hasOwner)) {
    res.status(400).json({ error: 'Rien à synchroniser.' });
    return;
  }

  const userId = user.userId;

  try {
    await withTransaction(async (client) => {
      // Le profil propriétaire est global au compte (table `owners`, clé
      // user_id) : state.owner en est la source depuis la refonte "profil
      // unique" ; fallback sur l'ancien modèle (owner dupliqué par animal)
      // pour les payloads envoyés par un client pas encore à jour.
      const ownerSource = state.owner || (state.animals[0] && state.animals[0].owner) || {};
      const ownerRow = toRow(ownerSource, OWNER_FIELDS, { user_id: userId });
      await upsertOne(client, 'owners', ['user_id', ...OWNER_FIELDS.map((f) => f[1])], ownerRow, ['user_id']);

      for (const wrapper of (state.animals || [])) {
        const petRow = toRow(wrapper.animal || {}, ANIMAL_FIELDS, { user_id: userId, local_id: wrapper.id });
        const petColumns = ['user_id', 'local_id', ...ANIMAL_FIELDS.map((f) => f[1])];
        const pet = await upsertOne(client, 'pets', petColumns, petRow, ['user_id', 'local_id']);
        const petId = pet.id;

        for (const [localKey, table, fields] of CHILD_ARRAYS) {
          const items = Array.isArray(wrapper[localKey]) ? wrapper[localKey] : [];
          if (!items.length) continue;
          const rows = items.map((item) => toRow(item, fields, { pet_id: petId, user_id: userId, local_id: item.id }));
          const columns = ['pet_id', 'user_id', 'local_id', ...fields.map((f) => f[1])];
          await upsertRows(client, table, columns, rows, ['pet_id', 'local_id']);
        }

        const weightHistory = (wrapper.animal && Array.isArray(wrapper.animal.weightHistory)) ? wrapper.animal.weightHistory : [];
        if (weightHistory.length) {
          const rows = weightHistory.map((w) => ({ pet_id: petId, user_id: userId, local_id: w.id, date: w.date, weight: w.weight }));
          await upsertRows(client, 'weight_history', ['pet_id', 'user_id', 'local_id', 'date', 'weight'], rows, ['pet_id', 'local_id']);
        }

        const heightHistory = (wrapper.animal && Array.isArray(wrapper.animal.heightHistory)) ? wrapper.animal.heightHistory : [];
        if (heightHistory.length) {
          const rows = heightHistory.map((h) => ({ pet_id: petId, user_id: userId, local_id: h.id, date: h.date, height: h.height }));
          await upsertRows(client, 'height_history', ['pet_id', 'user_id', 'local_id', 'date', 'height'], rows, ['pet_id', 'local_id']);
        }

        const meals = (wrapper.nutrition && Array.isArray(wrapper.nutrition.meals)) ? wrapper.nutrition.meals : [];
        if (meals.length) {
          const rows = meals.map((m) => toRow(m, MEAL_FIELDS, { pet_id: petId, user_id: userId, local_id: m.id }));
          const columns = ['pet_id', 'user_id', 'local_id', ...MEAL_FIELDS.map((f) => f[1])];
          await upsertRows(client, 'nutrition_meals', columns, rows, ['pet_id', 'local_id']);
        }

        if (wrapper.nutrition && wrapper.nutrition.dailyPlan) {
          const planRow = toRow(wrapper.nutrition.dailyPlan, NUTRITION_PLAN_FIELDS, { pet_id: petId, user_id: userId });
          const columns = ['pet_id', 'user_id', ...NUTRITION_PLAN_FIELDS.map((f) => f[1])];
          await upsertOne(client, 'nutrition_daily_plan', columns, planRow, ['pet_id']);
        }

        if (wrapper.pedigree) {
          const ped = wrapper.pedigree;
          const pedRow = toRow(ped, PEDIGREE_FIELDS, {
            pet_id: petId, user_id: userId,
            sire_name: ped.sire && ped.sire.name, sire_registry: ped.sire && ped.sire.registry,
            sire_pet_local_id: ped.sire && ped.sire.petId != null ? ped.sire.petId : null,
            dam_pet_local_id: ped.dam && ped.dam.petId != null ? ped.dam.petId : null,
            dam_name: ped.dam && ped.dam.name, dam_registry: ped.dam && ped.dam.registry,
            paternal_grandsire: ped.grandparents && ped.grandparents.paternalGrandsire,
            paternal_granddam: ped.grandparents && ped.grandparents.paternalGranddam,
            maternal_grandsire: ped.grandparents && ped.grandparents.maternalGrandsire,
            maternal_granddam: ped.grandparents && ped.grandparents.maternalGranddam,
            paternal_grandsire_registry: ped.grandparents && ped.grandparents.paternalGrandsireRegistry,
            paternal_granddam_registry: ped.grandparents && ped.grandparents.paternalGranddamRegistry,
            maternal_grandsire_registry: ped.grandparents && ped.grandparents.maternalGrandsireRegistry,
            maternal_granddam_registry: ped.grandparents && ped.grandparents.maternalGranddamRegistry,
          });
          const columns = [
            'pet_id', 'user_id', ...PEDIGREE_FIELDS.map((f) => f[1]),
            'sire_name', 'sire_registry', 'dam_name', 'dam_registry', 'sire_pet_local_id', 'dam_pet_local_id',
            'paternal_grandsire', 'paternal_granddam', 'maternal_grandsire', 'maternal_granddam',
            'paternal_grandsire_registry', 'paternal_granddam_registry', 'maternal_grandsire_registry', 'maternal_granddam_registry',
          ];
          await upsertOne(client, 'pedigree', columns, pedRow, ['pet_id']);
        }

        if (wrapper.notifications) {
          // Un client plus ancien (cache PWA pas encore rechargé, ou fixture de test) peut pousser un objet
          // `notifications` sans les clés ajoutées depuis : toRow() écrirait alors NULL sur ces colonnes
          // `not null default true`, ce qui casse tout le push. Les valeurs par défaut du schéma comblent
          // les clés manquantes sans jamais écraser une valeur explicitement envoyée par le client.
          const notifDefaults = { vaccineReminder: true, dewormingReminder: true, hygieneReminder: true, birthdayReminder: true, medicationReminder: true, matingReminder: true, monthlySummary: false };
          const notifRow = toRow(Object.assign({}, notifDefaults, wrapper.notifications), NOTIF_FIELDS, { pet_id: petId, user_id: userId });
          const columns = ['pet_id', 'user_id', ...NOTIF_FIELDS.map((f) => f[1])];
          await upsertOne(client, 'notification_prefs', columns, notifRow, ['pet_id']);
        }
      }

      if (vetDirectory && Array.isArray(vetDirectory.entries) && vetDirectory.entries.length) {
        const rows = vetDirectory.entries.map((e) => toRow(e, VET_CONTACT_FIELDS, { user_id: userId, local_id: e.id }));
        const columns = ['user_id', 'local_id', ...VET_CONTACT_FIELDS.map((f) => f[1])];
        await upsertRows(client, 'vet_contacts', columns, rows, ['user_id', 'local_id']);
      }
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sync/push', err);
    res.status(500).json({ error: 'Erreur lors de la synchronisation.' });
  }
}
