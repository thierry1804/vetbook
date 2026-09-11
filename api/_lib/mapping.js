// Mapping local (camelCase, objet `state` de app.js) <-> colonnes Neon
// (snake_case). Reprend exactement les tables de correspondance qui
// vivaient côté client dans data-layer.js (toRow/fromRow) — déplacées ici
// côté serveur puisque /api/sync/push et /api/sync/pull font maintenant
// le travail que faisait avant supabase-js directement depuis le navigateur.

export const ANIMAL_FIELDS = [
  ['name', 'name'], ['species', 'species'], ['race', 'race'], ['sex', 'sex'],
  ['dob', 'dob'], ['weight', 'weight'], ['color', 'color'], ['chip', 'chip'],
  ['sterilise', 'sterilise'], ['notes', 'notes'], ['height', 'height'],
  ['themeColor', 'theme_color'], ['avatar', 'avatar'],
];
export const OWNER_FIELDS = [['name', 'name'], ['phone', 'phone'], ['email', 'email'], ['clinic', 'clinic'], ['address', 'address']];
export const PEDIGREE_FIELDS = [
  ['registry', 'registry'], ['registryNumber', 'registry_number'], ['chipNumber', 'chip_number'],
];
export const NUTRITION_PLAN_FIELDS = [['targetCalories', 'target_calories'], ['mealsPerDay', 'meals_per_day'], ['foodBrand', 'food_brand'], ['portionSize', 'portion_size']];
export const NOTIF_FIELDS = [
  ['vaccineReminder', 'vaccine_reminder'], ['dewormingReminder', 'deworming_reminder'],
  ['hygieneReminder', 'hygiene_reminder'], ['birthdayReminder', 'birthday_reminder'],
  ['medicationReminder', 'medication_reminder'], ['monthlySummary', 'monthly_summary'],
];
export const MEAL_FIELDS = [['date', 'date'], ['type', 'type'], ['time', 'time'], ['food', 'food'], ['quantity', 'quantity'], ['unit', 'unit']];

// [clé du tableau local sur le wrapper animal, table cloud, colonnes]
export const CHILD_ARRAYS = [
  ['vaccines', 'vaccinations', [['date', 'date'], ['name', 'name'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['vet', 'vet']]],
  ['dewormings', 'dewormings', [['date', 'date'], ['name', 'name'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['type', 'type']]],
  ['consultations', 'consultations', [['date', 'date'], ['vet', 'vet'], ['reason', 'reason'], ['diagnosis', 'diagnosis'], ['treatment', 'treatment'], ['cost', 'cost'], ['notes', 'notes']]],
  ['medications', 'medications', [['name', 'name'], ['dosage', 'dosage'], ['frequency', 'frequency'], ['startDate', 'start_date'], ['endDate', 'end_date'], ['notes', 'notes'], ['active', 'active']]],
  ['hygiene', 'hygiene_events', [['type', 'type'], ['date', 'date'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['notes', 'notes']]],
  ['activities', 'activities', [['date', 'date'], ['type', 'type'], ['duration', 'duration'], ['distance', 'distance'], ['notes', 'notes']]],
  ['heatCycles', 'heat_cycles', [['startDate', 'start_date'], ['endDate', 'end_date'], ['intensity', 'intensity'], ['notes', 'notes']]],
  ['notes', 'journal_notes', [['date', 'date'], ['title', 'title'], ['content', 'content'], ['category', 'category'], ['symptomType', 'symptom_type'], ['severity', 'severity']]],
];
export const VET_CONTACT_FIELDS = [
  ['name', 'name'], ['clinic', 'clinic'], ['phone', 'phone'], ['email', 'email'], ['address', 'address'],
  ['lat', 'lat'], ['lng', 'lng'], ['hours', 'hours'], ['emergency', 'emergency'], ['favorite', 'favorite'], ['notes', 'notes'],
];

export function toRow(obj, fields, extra) {
  const row = Object.assign({}, extra);
  fields.forEach(([localKey, column]) => {
    const v = obj ? obj[localKey] : undefined;
    row[column] = (v === '' || v === undefined) ? null : v;
  });
  return row;
}

export function fromRow(row, fields, idAsLocalId) {
  const obj = {};
  fields.forEach(([localKey, column]) => { obj[localKey] = row[column] == null ? '' : row[column]; });
  if (idAsLocalId) obj.id = row.local_id;
  return obj;
}

// Upsert multi-lignes générique : construit un INSERT ... ON CONFLICT ...
// DO UPDATE paramétré à partir d'un tableau d'objets {colonne: valeur}.
export async function upsertRows(client, table, columns, rows, conflictColumns) {
  if (!rows.length) return [];
  const values = [];
  const params = [];
  rows.forEach((row, i) => {
    const placeholders = columns.map((_, j) => `$${i * columns.length + j + 1}`);
    values.push(`(${placeholders.join(', ')})`);
    columns.forEach((col) => params.push(row[col]));
  });
  const updateSet = columns
    .filter((c) => !conflictColumns.includes(c))
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const sql = `
    insert into ${table} (${columns.join(', ')})
    values ${values.join(', ')}
    on conflict (${conflictColumns.join(', ')}) do update set ${updateSet}
    returning *
  `;
  const { rows: result } = await client.query(sql, params);
  return result;
}

export async function upsertOne(client, table, columns, row, conflictColumns) {
  const [result] = await upsertRows(client, table, columns, [row], conflictColumns);
  return result;
}
