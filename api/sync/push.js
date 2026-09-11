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
  if (!state || !Array.isArray(state.animals) || state.animals.length === 0) {
    res.status(400).json({ error: 'Rien à synchroniser.' });
    return;
  }

  const userId = user.userId;

  try {
    await withTransaction(async (client) => {
      const ownerSource = (state.animals[0] && state.animals[0].owner) || {};
      const ownerRow = toRow(ownerSource, OWNER_FIELDS, { user_id: userId });
      await upsertOne(client, 'owners', ['user_id', ...OWNER_FIELDS.map((f) => f[1])], ownerRow, ['user_id']);

      for (const wrapper of state.animals) {
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
            dam_name: ped.dam && ped.dam.name, dam_registry: ped.dam && ped.dam.registry,
            paternal_grandsire: ped.grandparents && ped.grandparents.paternalGrandsire,
            paternal_granddam: ped.grandparents && ped.grandparents.paternalGranddam,
            maternal_grandsire: ped.grandparents && ped.grandparents.maternalGrandsire,
            maternal_granddam: ped.grandparents && ped.grandparents.maternalGranddam,
          });
          const columns = [
            'pet_id', 'user_id', ...PEDIGREE_FIELDS.map((f) => f[1]),
            'sire_name', 'sire_registry', 'dam_name', 'dam_registry',
            'paternal_grandsire', 'paternal_granddam', 'maternal_grandsire', 'maternal_granddam',
          ];
          await upsertOne(client, 'pedigree', columns, pedRow, ['pet_id']);
        }

        if (wrapper.notifications) {
          const notifRow = toRow(wrapper.notifications, NOTIF_FIELDS, { pet_id: petId, user_id: userId });
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
