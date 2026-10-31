// Compare immutable release entries, independent of object key order and array ordering.
const canonical = (value) => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
  return value;
}
const SECTIONS = {
  breedDb: 'Races', vaccineDb: 'Vaccins', lists: 'Listes', registries: 'Registres',
  checkupQuestions: 'Bilan de santé', tips: 'Conseils', events: 'Événements', clinics: 'Cliniques',
  emergencyNumbers: 'Urgences', pages: 'Pages',
};
function entries(section, value) {
  const out = new Map(); const occurrences = new Map();
  const add = (scope, row) => {
    const key = typeof row === 'object' && row !== null ? row.id ?? row.code ?? row.key ?? row.slug ?? row.name ?? row.label ?? row.title : row;
    const identity = JSON.stringify([scope, key]);
    const occurrence = occurrences.get(identity) || 0; occurrences.set(identity, occurrence + 1);
    const id = `${identity}:${occurrence}`;
    const label = typeof row === 'object' && row !== null ? row.title ?? row.name ?? row.label ?? row.code ?? row.key ?? row.slug ?? key : row;
    out.set(id, { label: [scope, label].filter(Boolean).join(' · '), value: row });
  };
  if (['breedDb', 'vaccineDb', 'lists'].includes(section)) {
    for (const [scope, rows] of Object.entries(value || {})) for (const row of rows || []) add(scope, row);
  } else if (section === 'registries') {
    for (const [key, row] of Object.entries(value || {})) out.set(key, { label: row.label || key, value: row });
  } else {
    for (const row of value || []) add(section === 'emergencyNumbers' ? row.country : '', row);
  }
  return out;
}
export function compareReleaseContent(before = {}, after = {}) {
  return Object.entries(SECTIONS).map(([key, label]) => {
    const oldEntries = entries(key, before[key]); const newEntries = entries(key, after[key]);
    const changes = [];
    for (const [id, row] of newEntries) {
      const old = oldEntries.get(id);
      if (!old || canonical(old.value) !== canonical(row.value)) changes.push({ id, label: row.label, kind: old ? 'modified' : 'added', before: old?.value ?? null, after: row.value });
    }
    for (const [id, row] of oldEntries) if (!newEntries.has(id)) changes.push({ id, label: row.label, kind: 'removed', before: row.value, after: null });
    return { key, label, added: changes.filter((c) => c.kind === 'added').length, modified: changes.filter((c) => c.kind === 'modified').length, removed: changes.filter((c) => c.kind === 'removed').length, changes };
  });
}
