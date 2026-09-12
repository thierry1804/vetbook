// GET /api/sync/pull
// Reconstruit le même objet `state` (+ vetDirectory) que pullAllFromCloud()
// produisait avant côté client via supabase-js. Chaque requête filtre
// explicitement sur user_id : il n'y a plus de RLS au niveau base pour le
// faire automatiquement (voir db/schema.sql).
import { withClient } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import {
  ANIMAL_FIELDS, OWNER_FIELDS, NUTRITION_PLAN_FIELDS, NOTIF_FIELDS,
  MEAL_FIELDS, CHILD_ARRAYS, VET_CONTACT_FIELDS, fromRow,
} from '../_lib/mapping.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;
  const userId = user.userId;

  try {
    const result = await withClient(async (client) => {
      const [petsRes, ownerRes, vetsRes] = await Promise.all([
        client.query('select * from pets where user_id = $1 order by created_at asc', [userId]),
        client.query('select * from owners where user_id = $1', [userId]),
        client.query('select * from vet_contacts where user_id = $1 order by local_id asc', [userId]),
      ]);

      const pets = petsRes.rows;
      const ownerRow = ownerRes.rows[0];
      // Le profil propriétaire (table `owners`, global au compte) peut
      // exister avant tout animal — ne pas traiter "aucun pet" comme
      // "rien à récupérer" sinon un compte tout juste créé perd son profil
      // au premier pull sur un nouvel appareil.
      if (pets.length === 0 && !ownerRow) return null;

      const ownerObj = ownerRow ? fromRow(ownerRow, OWNER_FIELDS) : { name: '', phone: '', email: '', clinic: '', address: '' };

      const wrappers = await Promise.all(pets.map(async (pet) => {
        const petId = pet.id;

        const childResults = await Promise.all(
          CHILD_ARRAYS.map(([, table]) =>
            client.query(`select * from ${table} where pet_id = $1 order by local_id asc`, [petId]))
        );
        const [weightRes, heightRes, mealsRes, planRes, pedRes, notifRes] = await Promise.all([
          client.query('select * from weight_history where pet_id = $1 order by local_id asc', [petId]),
          client.query('select * from height_history where pet_id = $1 order by local_id asc', [petId]),
          client.query('select * from nutrition_meals where pet_id = $1 order by local_id asc', [petId]),
          client.query('select * from nutrition_daily_plan where pet_id = $1', [petId]),
          client.query('select * from pedigree where pet_id = $1', [petId]),
          client.query('select * from notification_prefs where pet_id = $1', [petId]),
        ]);

        // pet.local_id (bigint) et pet.weight/height (numeric) reviennent en
        // string du driver Postgres — Number() pour matcher la convention
        // JS number utilisée partout côté client (comparaisons ===, calculs).
        const wrapper = { id: Number(pet.local_id), owner: ownerObj, photos: [] };
        wrapper.animal = fromRow(pet, ANIMAL_FIELDS);
        wrapper.animal.weight = pet.weight != null ? Number(pet.weight) : null;
        wrapper.animal.height = pet.height != null ? Number(pet.height) : null;
        wrapper.animal.weightHistory = weightRes.rows.map((w) => ({ id: Number(w.local_id), date: w.date, weight: Number(w.weight) }));
        wrapper.animal.heightHistory = heightRes.rows.map((h) => ({ id: Number(h.local_id), date: h.date, height: Number(h.height) }));

        CHILD_ARRAYS.forEach(([localKey, , fields], i) => {
          wrapper[localKey] = childResults[i].rows.map((row) => fromRow(row, fields, true));
        });
        // consultations.cost (numeric) : même souci de string renvoyée par
        // le driver Postgres que local_id/weight/height ci-dessus.
        if (Array.isArray(wrapper.consultations)) {
          wrapper.consultations.forEach((c) => { c.cost = c.cost === '' ? null : Number(c.cost); });
        }

        const planRow = planRes.rows[0];
        wrapper.nutrition = {
          meals: mealsRes.rows.map((m) => fromRow(m, MEAL_FIELDS, true)),
          dailyPlan: planRow ? fromRow(planRow, NUTRITION_PLAN_FIELDS) : { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' },
        };

        const pedRow = pedRes.rows[0];
        wrapper.pedigree = pedRow ? {
          registry: pedRow.registry || 'Non inscrit',
          registryNumber: pedRow.registry_number || '',
          chipNumber: pedRow.chip_number || '',
          sire: { name: pedRow.sire_name || '', registry: pedRow.sire_registry || '' },
          dam: { name: pedRow.dam_name || '', registry: pedRow.dam_registry || '' },
          grandparents: {
            paternalGrandsire: pedRow.paternal_grandsire || '',
            paternalGranddam: pedRow.paternal_granddam || '',
            maternalGrandsire: pedRow.maternal_grandsire || '',
            maternalGranddam: pedRow.maternal_granddam || '',
          },
        } : null;

        const notifRow = notifRes.rows[0];
        wrapper.notifications = notifRow ? fromRow(notifRow, NOTIF_FIELDS) : {};

        return wrapper;
      }));

      let maxId = 20;
      wrappers.forEach((w) => {
        maxId = Math.max(maxId, w.id || 0);
        CHILD_ARRAYS.forEach(([localKey]) => { (w[localKey] || []).forEach((it) => { maxId = Math.max(maxId, it.id || 0); }); });
        (w.animal.weightHistory || []).forEach((it) => { maxId = Math.max(maxId, it.id || 0); });
        (w.animal.heightHistory || []).forEach((it) => { maxId = Math.max(maxId, it.id || 0); });
        (w.nutrition.meals || []).forEach((it) => { maxId = Math.max(maxId, it.id || 0); });
      });

      const state = { animals: wrappers, nextId: maxId + 1, currentAnimalId: wrappers[0] ? wrappers[0].id : null, owner: ownerObj };

      let vetDirectory = null;
      if (vetsRes.rows.length) {
        let dirMaxId = 10;
        const entries = vetsRes.rows.map((row) => {
          const e = fromRow(row, VET_CONTACT_FIELDS, true);
          dirMaxId = Math.max(dirMaxId, e.id || 0);
          return e;
        });
        vetDirectory = { entries, nextId: dirMaxId + 1 };
      }

      return { state, vetDirectory };
    });

    if (!result) {
      res.status(200).json({ found: false });
      return;
    }
    res.status(200).json({ found: true, ...result });
  } catch (err) {
    console.error('sync/pull', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
  }
}
