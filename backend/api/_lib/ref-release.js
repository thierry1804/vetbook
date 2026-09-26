// Construit le contenu figé d'une version de référentiels, au format consommé par le front
// (mêmes structures que les constantes de app.js : BREED_DB, VACCINE_DB, SYMPTOM_TYPES, ...).
export async function buildReleaseContent(c) {
  const q = async (sql) => (await c.query(sql)).rows;
  const species = await q("select code from ref_species where status = 'actif' order by sort_order");
  const breedDb = {}; const vaccineDb = {};
  for (const s of species) { breedDb[s.code] = []; vaccineDb[s.code] = []; }
  for (const b of await q("select * from ref_breeds where status = 'actif' order by name")) {
    (breedDb[b.species_code] || (breedDb[b.species_code] = [])).push({
      name: b.name, weightMin: b.weight_min == null ? null : Number(b.weight_min), weightMax: b.weight_max == null ? null : Number(b.weight_max),
      aliases: b.aliases, fci: b.fci_number, ccSlug: b.cc_slug,
    });
  }
  for (const v of await q("select * from ref_vaccines where status = 'commercialise' order by name")) {
    (vaccineDb[v.species_code] || (vaccineDb[v.species_code] = [])).push(v.name);
  }
  const lists = {};
  for (const l of await q('select * from ref_lists where active order by list_type, sort_order, label')) (lists[l.list_type] || (lists[l.list_type] = [])).push({ label: l.label, ...l.meta });
  const registries = {};
  for (const r of await q("select * from ref_registries where status = 'actif'")) {
    registries[r.code] = { label: r.label, country: r.country, pattern: r.number_regex, lookupUrl: r.lookup_url, delays: r.delays };
  }
  const checkup = (await q('select * from ref_checkup_criteria where active order by sort_order')).map((k) => ({ key: k.key, label: k.label, icon: k.icon, levels: k.levels, advice: k.advice }));
  const tips = (await q("select id, title, body as content, category, species, country, author, vet_reviewed, featured from content_tips where status = 'publie' order by id"));
  const events = (await q("select id, title, description, month, day, event_date::text as date, recurring, location, country, link from content_events where status = 'publie' order by id"));
  const clinics = (await q("select id, name, address, city, country, lat, lng, phone, email, hours, on_call, emergency, species from directory_clinics where status = 'valide' order by id"));
  const emergency = (await q("select country, label, phone, hours from emergency_numbers where status = 'actif' order by country, sort_order"));
  const legal = (await q("select slug, kind, title, body, version, force_reaccept from content_pages where status = 'publie' and kind in ('legal','help','text') order by id"));
  const content = { breedDb, vaccineDb, lists, registries, checkupQuestions: checkup, tips, events, clinics, emergencyNumbers: emergency, pages: legal };
  content.counts = {
    breeds: Object.values(breedDb).reduce((n, a) => n + a.length, 0), vaccines: Object.values(vaccineDb).reduce((n, a) => n + a.length, 0),
    tips: tips.length, events: events.length, clinics: clinics.length, emergencyNumbers: emergency.length, pages: legal.length,
  };
  return content;
}
