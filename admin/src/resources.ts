// Description des ressources du backoffice (champs, droits, groupes). Les écrans sont générés dans content.tsx.
// Type de champ : text | longtext | html (WYSIWYG) | int | num | bool | json | date | ts | texts | select | country
export type Choice = string | { id: string | number; name: string };
export type Field = { name: string; type?: string; label?: string; choices?: Choice[]; required?: boolean; list?: boolean; readOnly?: boolean; help?: string; side?: boolean; short?: string };
export type Res = {
  name: string; label: string; perm: string; write?: string; fields: Field[]; readOnly?: boolean; deletable?: boolean;
  pk?: string; search?: boolean; group: string; createPk?: boolean; reason?: boolean; section?: string; defaults?: Record<string, any>; excerpt?: string; filters?: string[]; preview?: 'tip' | 'page' | 'event';
};

const STATUS_CONTENT = ['brouillon', 'publie', 'archive'];
const STATUS_DIRECTORY = ['a_valider', 'valide', 'archive'];
const TIP_CATEGORIES: Choice[] = [{ id: 'sante', name: 'Santé' }, { id: 'alimentation', name: 'Alimentation' }, { id: 'education', name: 'Éducation' }, { id: 'hygiene', name: 'Hygiène' }, { id: 'comportement', name: 'Comportement' }];
const SPECIES: Choice[] = [{ id: 'Canine', name: 'Chiens' }, { id: 'Féline', name: 'Chats' }];
const MONTHS: Choice[] = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((n, i) => ({ id: i + 1, name: n }));
const ACTIVE = ['actif', 'archive'];
const f = (name: string, type = 'text', extra: Partial<Field> = {}): Field => ({ name, type, ...extra });

export const RES: Res[] = [
  { name: 'tips', label: 'Conseils', group: 'Contenus', section: 'tips', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, excerpt: 'body', preview: 'tip',
    defaults: { status: 'brouillon', author: 'App\'lika', vet_reviewed: false, featured: false, country: 'ALL' }, filters: ['category', 'country'], fields: [
    f('title', 'text', { required: true, list: true }), f('body', 'html', { label: 'Contenu' }),
    f('status', 'select', { choices: STATUS_CONTENT, list: true, side: true }), f('category', 'select', { choices: TIP_CATEGORIES, list: true, side: true, required: true }),
    f('country', 'country', { list: true, side: true, help: 'Pays où le conseil est affiché.' }), f('species', 'select', { choices: SPECIES, side: true, help: 'Vide = toutes les espèces.' }),
    f('author', 'text', { side: true }), f('vet_reviewed', 'bool', { list: true, side: true, short: 'Relu' }), f('featured', 'bool', { side: true }), f('published_at', 'ts', { side: true, readOnly: true })] },
  { name: 'events', label: 'Événements', group: 'Contenus', section: 'events', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, preview: 'event',
    defaults: { status: 'brouillon', recurring: true, country: 'ALL' }, filters: ['country'], fields: [
    f('title', 'text', { required: true, list: true }), f('description', 'longtext'),
    f('month', 'select', { choices: MONTHS, list: true, required: true, side: true }), f('day', 'int', { list: true, required: true, side: true }),
    f('status', 'select', { choices: STATUS_CONTENT, list: true, side: true }), f('country', 'country', { list: true, side: true }),
    f('recurring', 'bool', { list: true, side: true, help: 'Se répète chaque année à la même date.' }), f('event_date', 'date', { side: true, help: 'Date précise (facultatif, événement ponctuel).' }),
    f('location', 'text', { side: true }), f('link', 'text', { side: true })] },
  { name: 'pages', label: 'Pages (aide, CGU…)', group: 'Contenus', section: 'pages', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, preview: 'page', excerpt: 'body',
    defaults: { status: 'brouillon', kind: 'help', version: '1', force_reaccept: false }, filters: ['kind'], fields: [
    f('title', 'text', { required: true, list: true }), f('body', 'html', { label: 'Contenu' }),
    f('status', 'select', { choices: STATUS_CONTENT, list: true, side: true }),
    f('kind', 'select', { choices: [{ id: 'help', name: 'Centre d\'aide' }, { id: 'legal', name: 'Mentions légales / CGU' }, { id: 'text', name: 'Texte libre' }], list: true, side: true, required: true }),
    f('slug', 'text', { required: true, list: true, side: true, help: 'Identifiant dans l\'URL, sans espace (généré depuis le titre).' }),
    f('version', 'text', { list: true, side: true }), f('force_reaccept', 'bool', { side: true, help: 'Demande une nouvelle acceptation aux utilisateurs (CGU).' }), f('published_at', 'ts', { side: true, readOnly: true })] },
  { name: 'clinics', label: 'Cliniques', group: 'Annuaire', section: 'clinics', perm: 'directory.read', write: 'directory.write', deletable: true, search: true,
    defaults: { status: 'a_valider', on_call: false, emergency: false, country: 'MG' }, filters: ['country'], fields: [
    f('name', 'text', { required: true, list: true }), f('city', 'text', { list: true }), f('country', 'country', { list: true }), f('phone', 'text', { list: true }),
    f('on_call', 'bool', { list: true }), f('emergency', 'bool', { list: true }), f('status', 'select', { choices: STATUS_DIRECTORY, list: true }),
    f('address'), f('email'), f('hours', 'text', { help: 'Ex. : Lun–Sam 8h–18h ou 24h/24.' }), f('lat', 'num', { help: 'Latitude (ex. -18.8792).' }), f('lng', 'num', { help: 'Longitude (ex. 47.5079).' }),
    f('species', 'texts', { label: 'Espèces prises en charge' }), f('source', 'text', { help: 'D\'où vient l\'information (visite, site web…).' })] },
  { name: 'emergency_numbers', label: 'Numéros d\'urgence', group: 'Annuaire', section: 'emergencyNumbers', perm: 'directory.read', write: 'directory.write', deletable: true, search: true,
    defaults: { status: 'actif', sort_order: 10, hours: '24h/24', country: 'MG' }, filters: ['country'], fields: [
    f('country', 'country', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('phone', 'text', { required: true, list: true }), f('hours', 'text', { list: true }),
    f('sort_order', 'int', { list: true, help: 'Plus petit = affiché en premier.' }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'breeds', section: 'breedDb', label: 'Races', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { required: true, list: true }), f('fci_number', 'text', { list: true }), f('weight_min', 'num'), f('weight_max', 'num'),
    f('height_min', 'num'), f('height_max', 'num'), f('cc_slug'), f('aliases', 'texts'), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'species', section: 'breedDb', label: 'Espèces', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', createPk: true, fields: [
    f('code', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('sort_order', 'int', { list: true }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'vaccines', section: 'vaccineDb', label: 'Vaccins', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { required: true, list: true }), f('laboratory', 'text', { list: true }), f('valences', 'text', { list: true }),
    f('default_interval_days', 'int', { list: true }), f('status', 'select', { choices: ['commercialise', 'retire'], list: true })] },
  { name: 'antiparasitics', section: 'vaccineDb', label: 'Antiparasitaires', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { list: true }), f('kind', 'text', { list: true }), f('default_interval_days', 'int', { list: true }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'lists', section: 'lists', label: 'Listes (symptômes, repas…)', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('list_type', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('sort_order', 'int', { list: true }), f('active', 'bool', { list: true }), f('meta', 'json')] },
  { name: 'checkup', section: 'checkupQuestions', label: 'Check-up', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, createPk: true, fields: [
    f('key', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('icon', 'text', { list: true }), f('sort_order', 'int', { list: true }),
    f('active', 'bool', { list: true }), f('levels', 'json'), f('advice', 'json')] },
  { name: 'registries', section: 'registries', label: 'Registres (LOF, LOMAD…)', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', createPk: true, search: true, fields: [
    f('code', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('country', 'text', { list: true }), f('number_regex', 'text'), f('lookup_url', 'text'),
    f('delays', 'json'), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'plans', label: 'Formules', group: 'Abonnements', perm: 'billing.read', write: 'billing.plans_write', createPk: true, search: true, fields: [
    f('code', 'text', { required: true, list: true }), f('name', 'text', { required: true, list: true }), f('audience', 'select', { choices: ['owner', 'practice'], list: true }),
    f('price_mga', 'int', { label: 'Prix (MGA)', list: true }), f('period', 'select', { choices: ['mensuel', 'annuel', 'unique'], list: true }), f('trial_days', 'int', { list: true }),
    f('country', 'text'), f('visible', 'bool', { list: true }), f('archived', 'bool', { list: true }), f('sort_order', 'int', { list: true })] },
  { name: 'features', label: 'Fonctionnalités', group: 'Abonnements', perm: 'billing.read', write: 'billing.plans_write', createPk: true, search: true, fields: [
    f('code', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('kind', 'select', { choices: ['boolean', 'quota'], list: true })] },
  { name: 'coupons', label: 'Coupons', group: 'Abonnements', perm: 'billing.read', write: 'billing.plans_write', deletable: true, createPk: true, search: true, fields: [
    f('code', 'text', { required: true, list: true }), f('percent_off', 'int', { list: true }), f('amount_off_mga', 'int', { list: true }), f('valid_until', 'date', { list: true }),
    f('max_uses', 'int', { list: true }), f('active', 'bool', { list: true })] },
  { name: 'subscriptions', label: 'Abonnements', group: 'Abonnements', perm: 'billing.read', write: 'billing.payment', search: true, fields: [
    f('user_id', 'text', { list: true }), f('plan_code', 'text', { list: true }), f('status', 'select', { choices: ['essai', 'actif', 'en_retard', 'suspendu', 'resilie'], list: true }),
    f('started_at', 'ts', { list: true }), f('ends_at', 'ts', { list: true }), f('auto_renew', 'bool', { list: true })] },
  { name: 'overrides', label: 'Droits accordés', group: 'Abonnements', perm: 'billing.read', write: 'billing.extend', deletable: true, reason: true, fields: [
    f('user_id', 'text', { required: true, list: true }), f('feature_code', 'text', { required: true, list: true }), f('enabled', 'bool', { list: true }), f('quota', 'num', { list: true }),
    f('expires_at', 'ts', { list: true }), f('reason', 'text', { required: true, list: true })] },
  { name: 'payments', label: 'Paiements', group: 'Abonnements', perm: 'billing.read', readOnly: true, search: true, fields: [
    f('id', 'int', { list: true }), f('user_id', 'text', { list: true }), f('amount_mga', 'int', { list: true }), f('method', 'text', { list: true }), f('reference', 'text', { list: true }),
    f('status', 'text', { list: true }), f('paid_at', 'ts', { list: true })] },
  { name: 'invoices', label: 'Factures', group: 'Abonnements', perm: 'billing.read', readOnly: true, search: true, fields: [
    f('number', 'text', { list: true }), f('user_id', 'text', { list: true }), f('amount_mga', 'int', { list: true }), f('issued_at', 'ts', { list: true })] },
  { name: 'settings', label: 'Réglages', group: 'Système', perm: 'system.read', write: 'system.write', createPk: true, search: true, fields: [
    f('key', 'text', { required: true, list: true }), f('value', 'json', { list: true })] },
  { name: 'flags', label: 'Feature flags', group: 'Système', perm: 'system.read', write: 'system.write', deletable: true, createPk: true, search: true, fields: [
    f('key', 'text', { required: true, list: true }), f('enabled', 'bool', { list: true }), f('note', 'text', { list: true })] },
  { name: 'jobs', label: 'Tâches planifiées', group: 'Système', perm: 'notifications.read', readOnly: true, fields: [
    f('id', 'int', { list: true }), f('job', 'text', { list: true }), f('status', 'text', { list: true }), f('started_at', 'ts', { list: true }), f('finished_at', 'ts', { list: true }),
    f('sent', 'int', { list: true }), f('failed', 'int', { list: true }), f('details', 'json')] },
  { name: 'messages', label: 'Journal des envois', group: 'Système', perm: 'notifications.read', readOnly: true, search: true, fields: [
    f('id', 'int', { list: true }), f('channel', 'text', { list: true }), f('template', 'text', { list: true }), f('recipient', 'text', { list: true }), f('status', 'text', { list: true }),
    f('error', 'text', { list: true }), f('created_at', 'ts', { list: true })] },
];


export const LABELS: Record<string, string> = {
  title: 'Titre', category: 'Catégorie', species: 'Espèce', country: 'Pays', status: 'Statut', vet_reviewed: 'Relu par un vétérinaire', featured: 'À la une', author: 'Auteur',
  published_at: 'Publié le', description: 'Description', month: 'Mois', day: 'Jour', event_date: 'Date', recurring: 'Annuel', location: 'Lieu', link: 'Lien', slug: 'Identifiant (slug)',
  kind: 'Type', version: 'Version', force_reaccept: 'Ré-acceptation forcée', name: 'Nom', city: 'Ville', phone: 'Téléphone', on_call: 'De garde', emergency: 'Urgences', address: 'Adresse',
  email: 'E-mail', hours: 'Horaires', source: 'Source', label: 'Libellé', sort_order: 'Ordre', species_code: 'Code espèce', fci_number: 'N° FCI', weight_min: 'Poids min (kg)',
  weight_max: 'Poids max (kg)', height_min: 'Taille min (cm)', height_max: 'Taille max (cm)', cc_slug: 'Identifiant Centrale canine', aliases: 'Alias', code: 'Code', laboratory: 'Laboratoire',
  valences: 'Valences', default_interval_days: 'Intervalle par défaut (jours)', list_type: 'Type de liste', active: 'Actif', meta: 'Métadonnées (JSON)', key: 'Clé', icon: 'Icône',
  levels: 'Niveaux (JSON)', advice: 'Conseils (JSON)', number_regex: 'Format du numéro (regex)', lookup_url: 'URL de recherche', delays: 'Délais (JSON)', audience: 'Public',
  period: 'Période', trial_days: 'Jours d\'essai', visible: 'Visible', archived: 'Archivée', percent_off: 'Réduction (%)', amount_off_mga: 'Réduction (MGA)', valid_until: 'Valable jusqu\'au',
  max_uses: 'Utilisations max', user_id: 'Utilisateur', plan_code: 'Formule', started_at: 'Début', ends_at: 'Fin', auto_renew: 'Renouvellement auto', feature_code: 'Fonctionnalité',
  enabled: 'Activé', quota: 'Quota', reason: 'Motif', expires_at: 'Expire le', id: 'N°', amount_mga: 'Montant (MGA)', method: 'Moyen', reference: 'Référence', paid_at: 'Payé le',
  number: 'Numéro', issued_at: 'Émise le', value: 'Valeur (JSON)', note: 'Note', job: 'Tâche', finished_at: 'Fin', sent: 'Envoyés', failed: 'Échecs', details: 'Détails', channel: 'Canal',
  template: 'Modèle', recipient: 'Destinataire', error: 'Erreur', created_at: 'Créé le',
};
export const label = (fl: Field) => fl.label || LABELS[fl.name] || fl.name;
