// Instantané en lecture seule d'un animal (lien vétérinaire, foyer). Mêmes conversions que sync/pull.
import {
  ANIMAL_FIELDS, NUTRITION_PLAN_FIELDS, MEAL_FIELDS, CHILD_ARRAYS, fromRow,
} from './mapping.js';

export async function petSnapshot(client, pet, { includeNotes = false, includePhotos = false } = {}) {
  const petId = pet.id;
  // Une même connexion pg ne traite qu'une requête à la fois : Promise.all ici ne
  // paralléliserait rien et déclenche l'avertissement de dépréciation de pg@9.
  const childResults = [];
  for (const [, table] of CHILD_ARRAYS) {
    childResults.push(await client.query(`select * from ${table} where pet_id = $1 order by local_id asc`, [petId]));
  }
  const weightRes = await client.query('select * from weight_history where pet_id = $1 order by date asc', [petId]);
  const heightRes = await client.query('select * from height_history where pet_id = $1 order by date asc', [petId]);
  const mealsRes = await client.query('select * from nutrition_meals where pet_id = $1 order by local_id desc limit 60', [petId]);
  const planRes = await client.query('select * from nutrition_daily_plan where pet_id = $1', [petId]);
  const pedRes = await client.query('select * from pedigree where pet_id = $1', [petId]);
  const photosRes = includePhotos
    ? await client.query('select id, caption, date::text as date from photos where pet_id = $1 order by date desc nulls last, local_id desc', [petId])
    : { rows: [] };

  const animal = fromRow(pet, ANIMAL_FIELDS);
  animal.weight = pet.weight != null ? Number(pet.weight) : null;
  animal.height = pet.height != null ? Number(pet.height) : null;
  animal.weightHistory = weightRes.rows.map((w) => ({ date: w.date, weight: Number(w.weight) }));
  animal.heightHistory = heightRes.rows.map((h) => ({ date: h.date, height: Number(h.height) }));
  // Les données ne contiennent ni identifiant interne ni avatar local : seulement ce qui se lit.
  delete animal.avatar;
  delete animal.themeColor;

  const out = { animal };
  CHILD_ARRAYS.forEach(([localKey], i) => {
    if (localKey === 'notes' && !includeNotes) return;
    out[localKey] = childResults[i].rows.map((row) => { const o = fromRow(row, CHILD_ARRAYS[i][2], true); delete o.id; return o; });
  });
  if (Array.isArray(out.consultations)) out.consultations.forEach((c) => { c.cost = c.cost === '' || c.cost == null ? null : Number(c.cost); });

  const plan = planRes.rows[0];
  out.nutrition = {
    dailyPlan: plan ? fromRow(plan, NUTRITION_PLAN_FIELDS) : {},
    meals: mealsRes.rows.map((m) => { const o = fromRow(m, MEAL_FIELDS, true); delete o.id; return o; }),
  };
  const ped = pedRes.rows[0];
  out.pedigree = ped ? { registry: ped.registry || '', registryNumber: ped.registry_number || '', chipNumber: ped.chip_number || '',
    sire: ped.sire_name || '', dam: ped.dam_name || '' } : null;
  out.photos = photosRes.rows.map((p) => ({ id: p.id, caption: p.caption || '', date: p.date || null }));
  return out;
}
