import React from 'react';
import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField, ArrayField, SingleFieldList, ChipField,
  Edit, Create, SimpleForm, TextInput, NumberInput, BooleanInput, SelectInput, ArrayInput, SimpleFormIterator, DateInput, DateTimeInput,
  SearchInput, SelectField, FunctionField, Show, SimpleShowLayout, required, usePermissions,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { permits } from './api';

// Type de champ : text | longtext | html (WYSIWYG) | int | num | bool | json | date | ts | texts | select
export type Field = { name: string; type?: string; label?: string; choices?: string[]; required?: boolean; list?: boolean; readOnly?: boolean };
export type Res = {
  name: string; label: string; perm: string; write?: string; fields: Field[]; readOnly?: boolean; deletable?: boolean;
  pk?: string; search?: boolean; group: string; createPk?: boolean; reason?: boolean;
};

const CONTENT = ['brouillon', 'publie', 'archive'];
const ACTIVE = ['actif', 'archive'];
const f = (name: string, type = 'text', extra: Partial<Field> = {}): Field => ({ name, type, ...extra });

export const RES: Res[] = [
  { name: 'tips', label: 'Conseils', group: 'Contenus', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, fields: [
    f('title', 'text', { required: true, list: true }), f('category', 'text', { list: true }), f('species', 'text', { list: true }), f('country', 'text', { list: true }),
    f('status', 'select', { choices: CONTENT, list: true }), f('vet_reviewed', 'bool', { list: true }), f('featured', 'bool'), f('author'), f('published_at', 'ts'), f('body', 'html', { label: 'Contenu' })] },
  { name: 'events', label: 'Événements', group: 'Contenus', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, fields: [
    f('title', 'text', { required: true, list: true }), f('country', 'text', { list: true }), f('month', 'int', { list: true }), f('day', 'int', { list: true }), f('event_date', 'date'),
    f('recurring', 'bool', { list: true }), f('location'), f('link'), f('status', 'select', { choices: CONTENT, list: true }), f('description', 'longtext')] },
  { name: 'pages', label: 'Pages (aide, CGU…)', group: 'Contenus', perm: 'contents.read', write: 'contents.write', deletable: true, search: true, fields: [
    f('slug', 'text', { required: true, list: true }), f('kind', 'select', { choices: ['help', 'legal', 'text'], list: true }), f('title', 'text', { required: true, list: true }),
    f('version', 'text', { list: true }), f('status', 'select', { choices: CONTENT, list: true }), f('force_reaccept', 'bool'), f('published_at', 'ts'), f('body', 'html', { label: 'Contenu' })] },
  { name: 'clinics', label: 'Cliniques', group: 'Annuaire', perm: 'directory.read', write: 'directory.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('city', 'text', { list: true }), f('country', 'text', { list: true }), f('phone', 'text', { list: true }),
    f('on_call', 'bool', { list: true }), f('emergency', 'bool', { list: true }), f('status', 'select', { choices: ['a_valider', 'valide', 'archive'], list: true }),
    f('address'), f('lat', 'num'), f('lng', 'num'), f('email'), f('hours'), f('species', 'texts'), f('source')] },
  { name: 'emergency_numbers', label: 'Numéros d\'urgence', group: 'Annuaire', perm: 'directory.read', write: 'directory.write', deletable: true, search: true, fields: [
    f('country', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('phone', 'text', { required: true, list: true }), f('hours', 'text', { list: true }),
    f('sort_order', 'int', { list: true }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'breeds', label: 'Races', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { required: true, list: true }), f('fci_number', 'text', { list: true }), f('weight_min', 'num'), f('weight_max', 'num'),
    f('height_min', 'num'), f('height_max', 'num'), f('cc_slug'), f('aliases', 'texts'), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'species', label: 'Espèces', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', createPk: true, fields: [
    f('code', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('sort_order', 'int', { list: true }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'vaccines', label: 'Vaccins', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { required: true, list: true }), f('laboratory', 'text', { list: true }), f('valences', 'text', { list: true }),
    f('default_interval_days', 'int', { list: true }), f('status', 'select', { choices: ['commercialise', 'retire'], list: true })] },
  { name: 'antiparasitics', label: 'Antiparasitaires', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('name', 'text', { required: true, list: true }), f('species_code', 'text', { list: true }), f('kind', 'text', { list: true }), f('default_interval_days', 'int', { list: true }), f('status', 'select', { choices: ACTIVE, list: true })] },
  { name: 'lists', label: 'Listes (symptômes, repas…)', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, fields: [
    f('list_type', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('sort_order', 'int', { list: true }), f('active', 'bool', { list: true }), f('meta', 'json')] },
  { name: 'checkup', label: 'Check-up', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', deletable: true, search: true, createPk: true, fields: [
    f('key', 'text', { required: true, list: true }), f('label', 'text', { required: true, list: true }), f('icon', 'text', { list: true }), f('sort_order', 'int', { list: true }),
    f('active', 'bool', { list: true }), f('levels', 'json'), f('advice', 'json')] },
  { name: 'registries', label: 'Registres (LOF, LOMAD…)', group: 'Référentiels', perm: 'referentiels.read', write: 'referentiels.write', createPk: true, search: true, fields: [
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

const LABELS: Record<string, string> = {
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
const label = (fl: Field) => fl.label || LABELS[fl.name] || fl.name;

const listField = (fl: Field) => {
  const p = { key: fl.name, source: fl.name, label: label(fl) };
  switch (fl.type) {
    case 'bool': return <BooleanField {...p} />;
    case 'int': case 'num': return <NumberField {...p} />;
    case 'date': return <DateField {...p} />;
    case 'ts': return <DateField {...p} showTime />;
    case 'json': return <FunctionField {...p} render={(r: any) => JSON.stringify(r[fl.name] ?? null).slice(0, 60)} />;
    case 'texts': return <FunctionField {...p} render={(r: any) => (r[fl.name] || []).join(', ')} />;
    case 'select': return <SelectField {...p} choices={(fl.choices || []).map((c) => ({ id: c, name: c }))} />;
    default: return <TextField {...p} />;
  }
};

// Les colonnes JSON sont éditées en texte ; on convertit à la volée pour ne jamais envoyer de chaîne invalide.
const jsonFormat = (v: any) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const jsonParse = (v: string) => { try { return v === '' ? null : JSON.parse(v); } catch { return v; } };
const jsonValidate = (v: any) => (typeof v === 'string' && v !== '' ? 'JSON invalide' : undefined);

const input = (fl: Field, isEdit: boolean, res: Res) => {
  const p: any = { key: fl.name, source: fl.name, label: label(fl), validate: fl.required ? required() : undefined, fullWidth: true };
  if (isEdit && res.createPk && fl.name === (res.pk || res.fields[0].name)) p.disabled = true;
  switch (fl.type) {
    case 'html': return <RichTextInput key={fl.name} source={fl.name} label={label(fl)} fullWidth />;
    case 'longtext': return <TextInput {...p} multiline minRows={3} />;
    case 'int': case 'num': return <NumberInput {...p} step={fl.type === 'int' ? 1 : 'any'} />;
    case 'bool': return <BooleanInput {...p} validate={undefined} />;
    case 'date': return <DateInput {...p} />;
    case 'ts': return <DateTimeInput {...p} />;
    case 'json': return <TextInput {...p} multiline minRows={4} format={jsonFormat} parse={jsonParse} validate={jsonValidate} sx={{ fontFamily: 'monospace' }} />;
    case 'texts': return (
      <ArrayInput key={fl.name} source={fl.name} label={label(fl)}>
        <SimpleFormIterator inline><TextInput source="" label={false} /></SimpleFormIterator>
      </ArrayInput>);
    case 'select': return <SelectInput {...p} choices={(fl.choices || []).map((c) => ({ id: c, name: c }))} emptyText="—" />;
    default: return <TextInput {...p} />;
  }
};

export function makeResource(res: Res, perms: string[]) {
  const canWrite = !res.readOnly && permits(perms, res.write);
  const filters = res.search ? [<SearchInput key="q" source="q" alwaysOn placeholder="Rechercher" />] : [];
  const RList = () => (
    <List filters={filters} perPage={25} sort={{ field: res.fields.find((x) => x.list)?.name || 'id', order: 'ASC' }} exporter={false}>
      <Datagrid rowClick={canWrite ? 'edit' : 'show'} bulkActionButtons={false}>{res.fields.filter((x) => x.list).map(listField)}</Datagrid>
    </List>
  );
  const RShow = () => (
    <Show><SimpleShowLayout>{res.fields.map(listField)}</SimpleShowLayout></Show>
  );
  const form = (isEdit: boolean) => (
    <SimpleForm>
      {res.reason ? <TextInput source="reason" label="Motif (journalisé)" validate={required()} fullWidth /> : null}
      {res.fields.map((fl) => input(fl, isEdit, res))}
    </SimpleForm>
  );
  const REdit = () => <Edit mutationMode="pessimistic">{form(true)}</Edit>;
  const RCreate = () => <Create redirect="list">{form(false)}</Create>;
  return { list: RList, show: res.readOnly || !canWrite ? RShow : undefined, edit: canWrite ? REdit : undefined, create: canWrite ? RCreate : undefined };
}
