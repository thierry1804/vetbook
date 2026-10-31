import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  Alert, Button, Form, Input, InputNumber, Select, Switch, DatePicker, Table, Tabs, Typography, message, Modal, Popconfirm, Space, Tag,
} from 'antd';
import { permits, api } from './api';
import { StatusChip, Pill, LABELS, sanitizeRich, textOf, PageHeader } from './ui';
import { Choice, Field, Res, label } from './resources';
import { ICONS } from './icons';
import { RichTextEditor } from './RichText';
import { ImportDialog, IMPORTABLE } from './ImportDialog';
import { toCsv, download } from './csv';
import { useResourceList, useResourceOne, useCreate, useUpdate, useDeleteOne, useUpdateMany } from './data';

const { Text } = Typography;

// ── Données d'aide : pays ouverts (réglage `open_countries`), mis en cache pour la session.
let metaCache: Promise<{ countries: { code: string; label: string }[] }> | null = null;
const loadMeta = () => (metaCache ||= api('/meta').then((r) => r.json).catch(() => { metaCache = null; return { countries: [] }; }));
const useCountryChoices = (withAll: boolean) => {
  const [c, setC] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => { loadMeta().then((m) => setC([...(withAll ? [{ value: 'ALL', label: 'Tous les pays' }] : []), ...m.countries.map((x) => ({ value: x.code, label: x.label }))])); }, [withAll]);
  return c;
};

const toOptions = (choices: Choice[] = []): { value: any; label: string }[] => choices.map((c) => (typeof c === 'string' ? { value: c, label: LABELS[c] || c } : { value: c.id, label: c.name }));
const STATUS_ACTIONS: Record<string, string> = { publie: 'Publier', brouillon: 'Repasser en brouillon', archive: 'Archiver', valide: 'Valider', a_valider: 'Marquer à valider', actif: 'Activer', commercialise: 'Commercialisé', retire: 'Retirer' };
const STATUS_PLURAL: Record<string, string> = { publie: 'Publiés', brouillon: 'Brouillons', archive: 'Archivés', valide: 'Validées', a_valider: 'À valider', actif: 'Actifs', commercialise: 'Commercialisés', retire: 'Retirés' };
const statusField = (res: Res) => res.fields.find((fl) => fl.name === 'status' && fl.type === 'select');
const allowAll = (res: Res) => res.defaults?.country === 'ALL';
const excerpt = (html: string, n = 110) => { const t = textOf(html); return t.length > n ? t.slice(0, n) + '…' : t; };

// ── Bandeau « modifications non publiées » : le contenu n'atteint l'app qu'après publication d'une version.
function PendingBanner({ section }: { section?: string }) {
  const nav = useNavigate();
  const [st, setSt] = useState<any>(null);
  useEffect(() => { if (section) api('/release-status').then((r) => setSt(r.json)).catch(() => undefined); }, [section]);
  if (!section || !st || !st.changed?.[section]) return null;
  return (
    <Alert type="info" showIcon style={{ marginBottom: 16 }}
      message={<>Des modifications ne sont pas encore visibles dans l'application. {st.draft_version ? `Un brouillon (v${st.draft_version}) attend d'être publié.` : "Crée une version puis fais-la publier (principe des quatre yeux)."}</>}
      action={<Button size="small" onClick={() => nav('/releases')}>{st.draft_version ? `Voir le brouillon v${st.draft_version}` : 'Préparer une version'}</Button>} />
  );
}

// ── Cellule de liste : rendu par type de champ.
function listColumn(fl: Field, res: Res, countries: { value: string; label: string }[]) {
  const isTitleWithExcerpt = fl.name === res.fields.find((x) => x.list)?.name && res.excerpt;
  const column: any = { title: fl.short || label(fl), dataIndex: fl.name, key: fl.name, sorter: true };
  if (isTitleWithExcerpt) {
    column.render = (_: any, r: any) => (
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[fl.name]}</div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{excerpt(r[res.excerpt!])}</Text>
      </div>);
    return column;
  }
  switch (fl.type) {
    case 'bool': column.render = (v: any) => (v ? <Tag color="success">Oui</Tag> : <Text type="secondary">—</Text>); break;
    case 'int': case 'num': column.render = (v: any) => (v == null ? '—' : Number(v).toLocaleString('fr-FR')); break;
    case 'date': column.render = (v: any) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—'); break;
    case 'ts': column.render = (v: any) => (v ? new Date(v).toLocaleString('fr-FR') : '—'); break;
    case 'json': column.render = (v: any) => (v == null ? '—' : JSON.stringify(v).slice(0, 60)); break;
    case 'texts': column.render = (v: any) => (v || []).join(', ') || '—'; break;
    case 'country': column.render = (v: any) => (v === 'ALL' ? 'Tous' : v || '—'); break;
    case 'select':
      column.render = (v: any) => (fl.name === 'status' ? <StatusChip value={v} /> : (toOptions(fl.choices).find((c) => String(c.value) === String(v))?.label ?? v ?? '—'));
      break;
    default: column.render = (v: any) => (v === '' || v == null ? '—' : v);
  }
  return column;
}

const jsonFormat = (v: any) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const jsonParse = (v: string) => { try { return v === '' ? null : JSON.parse(v); } catch { return v; } };

// Liste de jetons supprimables + saisie d'ajout — remplace le « + » nu d'un composant de liste par défaut.
function TagsInput({ value, onChange }: { value?: string[]; onChange?: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const v: string[] = Array.isArray(value) ? value : [];
  const add = () => { const t = draft.trim(); if (t && !v.includes(t)) onChange?.([...v, t]); setDraft(''); };
  const remove = (i: number) => onChange?.(v.filter((_, idx) => idx !== i));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 8, border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', minHeight: 44 }}>
      {v.map((t, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--ant-color-primary)', color: '#fff', opacity: .92, fontSize: 12.5, fontWeight: 600, borderRadius: 6, padding: '3px 6px 3px 10px' }}>
          {t}
          <button type="button" aria-label={`Retirer ${t}`} onClick={() => remove(i)}
            style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.25)', color: 'inherit', fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !draft && v.length) remove(v.length - 1); }}
        onBlur={add} placeholder="Ajouter…"
        style={{ border: 'none', outline: 'none', background: 'transparent', flex: '1 1 120px', minWidth: 100, fontSize: 13, fontFamily: 'inherit', color: 'inherit' }} />
    </div>
  );
}

// Form.Item clone son unique enfant pour lui injecter value/onChange/id : on relaie donc tout ce qui
// arrive ici (...field) vers le vrai contrôle, sinon le champ est visuellement présent mais déconnecté
// du formulaire (ni saisie, ni valeurs par défaut, ni soumission).
function FieldInput({ fl, isEdit, res, countries, ...field }: { fl: Field; isEdit: boolean; res: Res; countries: { value: string; label: string }[] } & Record<string, any>) {
  const disabled = fl.readOnly || (isEdit && !!res.createPk && fl.name === res.fields[0].name);
  switch (fl.type) {
    case 'html': return <RichTextEditor {...field} />;
    case 'longtext': return <Input.TextArea {...field} autoSize={{ minRows: 3 }} disabled={disabled} />;
    case 'int': return <InputNumber {...field} style={{ width: '100%' }} step={1} disabled={disabled} />;
    case 'num': return <InputNumber {...field} style={{ width: '100%' }} step="any" disabled={disabled} />;
    case 'bool': return <Switch {...field} disabled={disabled} />;
    case 'date': return <DatePicker {...field} style={{ width: '100%' }} format="YYYY-MM-DD" disabled={disabled} />;
    case 'ts': return <DatePicker {...field} style={{ width: '100%' }} showTime format="YYYY-MM-DD HH:mm" disabled={disabled} />;
    case 'json': return <Input.TextArea {...field} autoSize={{ minRows: 4 }} disabled={disabled} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />;
    case 'texts': return <TagsInput {...field} />;
    case 'country': return <Select {...field} options={countries} showSearch optionFilterProp="label" allowClear={!allowAll(res)} disabled={disabled} />;
    case 'select': return <Select {...field} options={toOptions(fl.choices)} showSearch optionFilterProp="label" allowClear disabled={disabled} />;
    default: return <Input {...field} disabled={disabled} />;
  }
}

// ── Groupe les champs par section : un champ qui déclare `section` ouvre un nouveau groupe titré ;
// les champs suivants sans section déclarée rejoignent ce groupe, jusqu'au prochain. Sans aucune
// section déclarée dans la ressource, tout reste dans un seul groupe sans titre (petits formulaires).
function groupFields(fields: Field[]): { title?: string; fields: Field[] }[] {
  const groups: { title?: string; fields: Field[] }[] = [];
  let current: { title?: string; fields: Field[] } | null = null;
  for (const fl of fields) {
    if (fl.section) { current = { title: fl.section, fields: [fl] }; groups.push(current); }
    else if (current) current.fields.push(fl);
    else { current = { title: undefined, fields: [fl] }; groups.push(current); }
  }
  return groups;
}
const WIDE_TYPES = new Set(['json', 'longtext', 'texts', 'html']);

function FieldGroup({ title, fields, isEdit, res, countries }: { title?: string; fields: Field[]; isEdit: boolean; res: Res; countries: { value: string; label: string }[] }) {
  return (
    <div>
      {title ? <div style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)', margin: '0 0 12px' }}>{title}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0 20px' }} className="field-grid">
        {fields.map((fl) => (
          <Form.Item key={fl.name} name={fl.name} label={label(fl)} valuePropName={fl.type === 'bool' ? 'checked' : 'value'}
            rules={fl.required ? [{ required: true, message: `${label(fl)} est requis` }] : undefined}
            extra={fl.help} style={WIDE_TYPES.has(fl.type || '') ? { gridColumn: '1 / -1' } : undefined}>
            <FieldInput fl={fl} isEdit={isEdit} res={res} countries={countries} />
          </Form.Item>
        ))}
      </div>
    </div>
  );
}

// ── Aperçu, toujours à droite : fidèle au rendu réel pour les contenus (conseil/page/événement),
// générique pour tout le reste (icône, titre, statut, quelques faits) — jamais de panneau vide.
const CAT: Record<string, string> = { sante: 'Santé', alimentation: 'Alimentation', education: 'Éducation', hygiene: 'Hygiène', comportement: 'Comportement' };
const LABELS_MONTH = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function ContentPreview({ kind, v }: { kind: 'tip' | 'page' | 'event'; v: any }) {
  const month = LABELS_MONTH[Number(v?.month) - 1];
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, padding: 16, background: 'var(--ant-color-fill-tertiary)' }}>
      {kind === 'tip' && v?.category ? <Pill label={CAT[v.category] || v.category} /> : null}
      {kind === 'event' ? <div style={{ color: 'var(--ant-color-primary)', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{v?.day || '?'} {month || ''}{v?.recurring ? ' · chaque année' : ''}</div> : null}
      <div style={{ fontWeight: 700, fontSize: 15, marginTop: kind === 'tip' && v?.category ? 8 : 0 }}>{v?.title || 'Titre'}</div>
      {kind === 'event' ? <div style={{ marginTop: 4, fontSize: 13.5 }}>{v?.description}</div>
        : <div className="cms-preview" style={{ marginTop: 4, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: sanitizeRich(v?.body || '') }} />}
      {kind === 'tip' ? <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>{v?.author || "App'lika"}{v?.vet_reviewed ? ' · relu par un vétérinaire' : ''}</Text> : null}
    </div>
  );
}

function GenericPreview({ res, v }: { res: Res; v: any }) {
  v = v || {};
  const st = statusField(res);
  const titleField = res.fields.find((fl) => fl.list && fl.type !== 'select' && fl.type !== 'bool' && fl !== st) || res.fields[0];
  const subtitleField = res.fields.find((fl) => fl.list && fl !== titleField && fl !== st && ['text', 'country'].includes(fl.type || 'text'));
  const Icon = ICONS[res.name];
  const boolFlags = res.fields.filter((fl) => fl.type === 'bool' && fl.list && v[fl.name]);
  const factFields = res.fields.filter((fl) =>
    !WIDE_TYPES.has(fl.type || '') && fl !== titleField && fl !== st && fl !== subtitleField && fl.type !== 'bool' &&
    v[fl.name] != null && v[fl.name] !== '').slice(0, 6);
  const title = (titleField && v[titleField.name]) || 'Nouvelle fiche';
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {Icon ? <Icon style={{ fontSize: 17 }} /> : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={String(title)}>{title}</div>
          {subtitleField ? <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v[subtitleField.name]}</Text> : null}
        </div>
      </div>
      {st || boolFlags.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: factFields.length ? 12 : 0 }}>
          {st ? <StatusChip value={v[st.name]} /> : null}
          {boolFlags.map((fl) => <Pill key={fl.name} label={label(fl)} />)}
        </div>
      ) : null}
      {factFields.length ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {factFields.map((fl) => (
            <div key={fl.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>{label(fl)}</Text>
              <Text style={{ fontSize: 13, textAlign: 'right', overflowWrap: 'anywhere' }}>{String(v[fl.name])}</Text>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// ── Conversion valeurs API ↔ formulaire (dates en Dayjs, JSON en texte formaté).
function toFormValues(record: any, res: Res) {
  const out: any = { ...record };
  for (const fl of res.fields) {
    const v = out[fl.name];
    if (fl.type === 'date' || fl.type === 'ts') out[fl.name] = v ? dayjs(v) : undefined;
    else if (fl.type === 'json') out[fl.name] = jsonFormat(v);
    else if (fl.type === 'texts') out[fl.name] = Array.isArray(v) ? v : [];
  }
  return out;
}
function fromFormValues(values: any, res: Res, statusOverride?: string) {
  const out: any = { ...values };
  for (const fl of res.fields) {
    const v = out[fl.name];
    if (fl.type === 'date') out[fl.name] = v ? (v as Dayjs).format('YYYY-MM-DD') : null;
    else if (fl.type === 'ts') out[fl.name] = v ? (v as Dayjs).toISOString() : null;
    else if (fl.type === 'json') out[fl.name] = fl.lenient ? (() => { const j = jsonParse(v); return j === null && String(v).trim() !== '' ? v : j; })() : jsonParse(v);
  }
  if (statusOverride) out.status = statusOverride;
  return out;
}

function FormToolbar({ res, isEdit, saving, onSave, onDelete }: { res: Res; isEdit: boolean; saving: boolean; onSave: (status?: string) => void; onDelete?: () => void }) {
  const st = statusField(res);
  const choices = toOptions(st?.choices).map((c) => String(c.value));
  const publish = choices.includes('publie') ? 'publie' : choices.includes('valide') ? 'valide' : null;
  // Supprimer est irréversible : séparé spatialement des actions de sauvegarde (pas seulement par la couleur)
  // pour qu'un clic rapide ne puisse pas l'atteindre par erreur en visant Enregistrer.
  return (
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        <Button type="primary" loading={saving} onClick={() => onSave()}>Enregistrer</Button>
        {publish ? <Button loading={saving} onClick={() => onSave(publish)}>{publish === 'publie' ? 'Enregistrer et publier' : 'Enregistrer et valider'}</Button> : null}
      </Space>
      {isEdit && res.deletable && onDelete ? (
        <Popconfirm title="Supprimer définitivement ?" description="Cette action est irréversible. Pour retirer un contenu sans le perdre, passe-le en « archivé »." okText="Supprimer" okButtonProps={{ danger: true }} onConfirm={onDelete}>
          <Button danger type="text" size="small">Supprimer</Button>
        </Popconfirm>
      ) : null}
    </div>
  );
}

export function makeResource(res: Res, perms: string[]) {
  const canWrite = !res.readOnly && permits(perms, res.write);
  const st = statusField(res);
  const stChoices = toOptions(st?.choices);
  const canImport = canWrite && IMPORTABLE.includes(res.name);
  const defaultSort = { field: res.name === 'events' ? 'month' : res.excerpt ? 'id' : (res.fields.find((x) => x.list)?.name || 'id'), order: (res.excerpt && res.name !== 'events' ? 'DESC' : 'ASC') as 'ASC' | 'DESC' };

  const DEDICATED = new Set(['users', 'audit', 'releases', 'admins']);
  const exportCsv = async (filter: any, sort: typeof defaultSort) => {
    const qs = new URLSearchParams({ range: JSON.stringify([0, 9999]), sort: JSON.stringify([sort.field, sort.order]), filter: JSON.stringify(filter || {}) });
    const base = DEDICATED.has(res.name) ? `/${res.name}` : `/r/${res.name}`;
    const { json } = await api<any[]>(`${base}?${qs}`);
    const cols = res.fields.filter((fl) => !fl.readOnly);
    const cell = (r: any, fl: Field) => (Array.isArray(r[fl.name]) ? r[fl.name].join('|') : fl.type === 'json' && r[fl.name] != null ? JSON.stringify(r[fl.name]) : r[fl.name]);
    download(`${res.name}.csv`, toCsv([cols.map((c) => c.name), ...(json || []).map((r) => cols.map((c) => cell(r, c)))]));
  };

  const RList = () => {
    const navigate = useNavigate();
    const [importing, setImporting] = useState(false);
    const countries = useCountryChoices(allowAll(res));
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState(defaultSort);
    const [filter, setFilter] = useState<Record<string, any>>({});
    const { data, isFetching } = useResourceList(res.name, { page, perPage: 25, sort, filter });
    const [selected, setSelected] = useState<React.Key[]>([]);
    const updateMany = useUpdateMany(res.name);

    // Une colonne entièrement vide sur la page affichée n'apporte rien (ex. Vaccins : Laboratoire/Valences/
    // Intervalle jamais renseignés) — elle disparaît tant que personne ne remplit ce champ ; dès qu'une ligne
    // le renseigne, elle revient. La première colonne (identité) reste toujours visible.
    const columns = useMemo(() => {
      const listFields = res.fields.filter((x) => x.list);
      const rows = data?.data || [];
      const visible = listFields.filter((fl, i) => i === 0 || !rows.length
        || rows.some((r: any) => { const v = r[fl.name]; return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0); }));
      return visible.map((fl) => listColumn(fl, res, countries));
    }, [countries, data]);

    const runBulk = (status: string) => updateMany.mutate({ ids: selected as (string | number)[], data: { status } }, {
      onSuccess: () => { message.success(`${selected.length} élément(s) mis à jour`); setSelected([]); },
      onError: (e: any) => message.error(e.message),
    });

    return (
      <div style={{ padding: 24 }}>
        <PendingBanner section={res.section} />
        <PageHeader title={res.label} actions={
          <Space wrap>
            <Button onClick={() => exportCsv(filter, sort)}>Exporter CSV</Button>
            {canImport ? <Button onClick={() => setImporting(true)}>Importer</Button> : null}
            {canWrite ? <Button type="primary" onClick={() => navigate(`/${res.name}/create`)}>Nouveau</Button> : null}
          </Space>} />
        {st ? (
          <Tabs activeKey={filter.status ?? ''} onChange={(k) => { setFilter({ ...filter, status: k || undefined }); setPage(1); }}
            items={[{ key: '', label: 'Tous' }, ...stChoices.map((c) => ({ key: String(c.value), label: STATUS_PLURAL[String(c.value)] || c.label }))]} />
        ) : null}
        <Space wrap style={{ marginBottom: 12 }}>
          {res.search ? <Input.Search placeholder="Rechercher" allowClear style={{ width: 280 }} onSearch={(q) => { setFilter({ ...filter, q: q || undefined }); setPage(1); }} /> : null}
          {(res.filters || []).map((name) => {
            const fl = res.fields.find((x) => x.name === name)!;
            const options = fl.type === 'country' ? countries : fl.type === 'bool' ? [{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }] : toOptions(fl.choices);
            return <Select key={name} placeholder={label(fl)} allowClear style={{ width: 180 }}
              options={options}
              value={filter[name]} onChange={(v) => { setFilter({ ...filter, [name]: v }); setPage(1); }} />;
          })}
          {canWrite && st && selected.length ? (
            <Space wrap>
              <Text type="secondary" style={{ fontSize: 13 }}>{selected.length} sélectionné(s) :</Text>
              {stChoices.map((c) => <Button key={String(c.value)} size="small" loading={updateMany.isPending} onClick={() => runBulk(String(c.value))}>{STATUS_ACTIONS[String(c.value)] || c.label}</Button>)}
            </Space>
          ) : null}
        </Space>
        <Table rowKey="id" dataSource={data?.data} columns={columns} loading={isFetching}
          pagination={{ current: page, pageSize: 25, total: data?.total, showSizeChanger: false, onChange: setPage }}
          rowSelection={canWrite && st ? { selectedRowKeys: selected, onChange: setSelected } : undefined}
          onChange={(_p, _f, sorter: any) => { if (sorter?.field && sorter?.order) setSort({ field: sorter.field, order: sorter.order === 'ascend' ? 'ASC' : 'DESC' }); }}
          onRow={(record: any) => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/${res.name}/${record.id}${canWrite ? '' : '/show'}`) })} />
        {canImport ? <ImportDialog res={res} open={importing} onClose={() => setImporting(false)} /> : null}
      </div>
    );
  };

  const RShow = () => {
    const { id } = useParams();
    const { data: record } = useResourceOne(res.name, id);
    if (!record) return null;
    return (
      <div style={{ padding: 24, maxWidth: 760 }}>
        <PageHeader title={res.label} />
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: '0 16px' }}>
          {res.fields.map((fl, i) => (
            <div key={fl.name} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: i < res.fields.length - 1 ? '1px solid var(--ant-color-border)' : 'none' }}>
              <Text type="secondary" style={{ fontSize: 13, minWidth: 180, flex: 'none' }}>{label(fl)}</Text>
              <Text style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{fl.type === 'select' && fl.name === 'status' ? <StatusChip value={record[fl.name]} /> : fl.type === 'json' ? JSON.stringify(record[fl.name]) : fl.type === 'texts' ? (record[fl.name] || []).join(', ') : fl.type === 'bool' ? (record[fl.name] ? 'Oui' : 'Non') : String(record[fl.name] ?? '—')}</Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ResourceForm = ({ isEdit }: { isEdit: boolean }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const duplicateRecord = (location.state as any)?.record;
    const countries = useCountryChoices(allowAll(res));
    const [form] = Form.useForm();
    const { data: record, isLoading } = useResourceOne(res.name, isEdit ? id : undefined);
    const create = useCreate(res.name);
    const update = useUpdate(res.name);
    const del = useDeleteOne(res.name);
    const groups = useMemo(() => groupFields(res.fields), []);
    const v = Form.useWatch([], form) || {};

    useEffect(() => { if (isEdit && record) form.setFieldsValue(toFormValues(record, res)); }, [record]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!isEdit) form.setFieldsValue(toFormValues(duplicateRecord || res.defaults || {}, res)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const slugTouched = React.useRef(false);
    const onValuesChange = (changed: any) => {
      if ('slug' in changed) slugTouched.current = true;
      if (res.name === 'pages' && !isEdit && 'title' in changed && !slugTouched.current) form.setFieldValue('slug', slugify(String(changed.title || '')));
    };

    const saving = create.isPending || update.isPending;
    const submit = async (statusOverride?: string) => {
      try {
        const values = await form.validateFields();
        const data = fromFormValues(values, res, statusOverride);
        if (isEdit) await update.mutateAsync({ id: id!, data });
        else await create.mutateAsync(data);
        message.success('Enregistré');
        navigate(`/${res.name}`);
      } catch (e: any) { if (e?.errorFields) return; message.error(e.message || 'Échec'); }
    };
    const onDelete = async () => {
      try { await del.mutateAsync({ id: id! }); message.success('Supprimé'); navigate(`/${res.name}`); }
      catch (e: any) { message.error(e.message); }
    };

    if (isEdit && isLoading) return null;

    return (
      <div style={{ padding: 24 }}>
        <PendingBanner section={res.section} />
        <PageHeader title={`${res.label} — ${isEdit ? 'modifier' : 'nouveau'}`}
          actions={isEdit && record ? (
            <Button size="small" onClick={() => { const copy: any = { ...record }; delete copy.id; delete copy.published_at; if (copy.status) copy.status = res.defaults?.status || 'brouillon'; if (copy.title) copy.title = `${copy.title} (copie)`; if (copy.slug) copy.slug = `${copy.slug}-copie`; navigate(`/${res.name}/create`, { state: { record: copy } }); }}>Dupliquer</Button>
          ) : undefined} />
        <Form form={form} layout="vertical" onValuesChange={onValuesChange} style={{ maxWidth: 1040 }}>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0,1fr) 300px', alignItems: 'start' }} className="resource-form-grid">
            <div style={{ display: 'grid', gap: 24 }}>
              {res.reason ? <Form.Item name="reason" label="Motif (journalisé)" rules={[{ required: true, message: 'Motif requis' }]}><Input.TextArea autoSize={{ minRows: 2 }} /></Form.Item> : null}
              {groups.map((g, i) => <FieldGroup key={i} title={g.title} fields={g.fields} isEdit={isEdit} res={res} countries={countries} />)}
            </div>
            <div style={{ position: 'sticky', top: 76, border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ant-color-border)' }}>
                <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)' }}>Aperçu</span>
              </div>
              <div style={{ padding: 16 }}>
                {res.preview ? <ContentPreview kind={res.preview} v={v} /> : <GenericPreview res={res} v={v} />}
              </div>
            </div>
          </div>
          <FormToolbar res={res} isEdit={isEdit} saving={saving} onSave={submit} onDelete={isEdit ? onDelete : undefined} />
        </Form>
      </div>
    );
  };

  const RCreate = () => <ResourceForm isEdit={false} />;
  const REdit = () => <ResourceForm isEdit />;
  return { List: RList, Show: res.readOnly || !canWrite ? RShow : undefined, Edit: canWrite ? REdit : undefined, Create: canWrite ? RCreate : undefined };
}
export { RES } from './resources';
