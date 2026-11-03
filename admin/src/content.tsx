import { SpeciesUsage, confirmSpeciesArchive } from './SpeciesUsage';
import { JobDetails } from './JobDetails';
import { RecordHistory } from './RecordHistory';
import { ManagedTable } from './ManagedTable';
import { useQueryClient } from '@tanstack/react-query';
import { QueryFeedback } from './QueryFeedback';
import { useListState, useListReturn, useUnsavedChanges } from './interaction';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  Alert, Button, Empty, Form, Input, InputNumber, Select, Switch, DatePicker, Tabs, Typography, message, Modal, Popconfirm, Space, Tag,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CheckOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { permits, api } from './api';
import { StatusChip, Pill, LABELS, sanitizeRich, textOf, PageHeader, RelativeDate } from './ui';
import { Choice, Field, Res, label } from './resources';
import { ICONS } from './icons';
import { RichTextEditor } from './RichText';
import { ImportDialog, IMPORTABLE } from './ImportDialog';
import { toCsv, download } from './csv';
import { useResourceList, useResourceOne, useCreate, useUpdate, useDeleteOne, useUpdateMany, useStatusCounts, invalidateResource } from './data';

const { Text } = Typography;

// ── Données d'aide : pays ouverts (réglage `open_countries`) et référentiel espèces, mis en cache pour la session.
let metaCache: Promise<{ countries: { code: string; label: string }[]; species: { code: string; label: string }[] }> | null = null;
const loadMeta = () => (metaCache ||= api('/meta').then((r) => r.json).catch(() => { metaCache = null; return { countries: [], species: [] }; }));
const useCountryChoices = (withAll: boolean) => {
  const [c, setC] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => { loadMeta().then((m) => setC([...(withAll ? [{ value: 'ALL', label: 'Tous les pays' }] : []), ...m.countries.map((x) => ({ value: x.code, label: x.label }))])); }, [withAll]);
  return c;
};
// Remplace le champ libre « Code espèce » (Races/Vaccins/Antiparasitaires) : une faute de frappe cassait
// le lien avec le référentiel Espèces sans avertissement. Liste chargée depuis ce même référentiel.
const useSpeciesChoices = () => {
  const [c, setC] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => { loadMeta().then((m) => setC(m.species.map((x) => ({ value: x.code, label: x.label })))); }, []);
  return c;
};

const toOptions = (choices: Choice[] = []): { value: any; label: string }[] => choices.map((c) => (typeof c === 'string' ? { value: c, label: LABELS[c] || c } : { value: c.id, label: c.name }));
const STATUS_ACTIONS: Record<string, string> = { publie: 'Publier', brouillon: 'Repasser en brouillon', archive: 'Archiver', valide: 'Valider', a_valider: 'Marquer à valider', actif: 'Activer', commercialise: 'Commercialisé', retire: 'Retirer' };
const STATUS_PLURAL: Record<string, string> = { publie: 'Publiés', brouillon: 'Brouillons', archive: 'Archivés', valide: 'Validées', a_valider: 'À valider', actif: 'Actifs', commercialise: 'Commercialisés', retire: 'Retirés' };
const statusField = (res: Res) => res.fields.find((fl) => fl.name === 'status' && fl.type === 'select');
const allowAll = (res: Res) => res.defaults?.country === 'ALL';
const excerpt = (html: string, n = 110) => { const t = textOf(html); return t.length > n ? t.slice(0, n) + '…' : t; };

// L'indicateur « modifications non publiées » est maintenant une pastille fixe dans la barre du haut
// (ReleasePill, Layout.tsx) — visible sur tous les écrans à la fois, plus de bandeau par page qui
// décalait le titre et n'apparaissait que sur certaines ressources.

// ── Cellule de liste : rendu par type de champ.
function listColumn(fl: Field, res: Res, countries: { value: string; label: string }[], species: { value: string; label: string }[]) {
  const isTitleWithExcerpt = fl.name === res.fields.find((x) => x.list)?.name && res.excerpt;
  const column: any = { title: fl.short || label(fl), dataIndex: fl.name, key: fl.name, sorter: true };
  if (fl.name === 'job_run_id') { column.render = (value: any) => value ? <Link onClick={(event) => event.stopPropagation()} to={`/jobs/${value}/show`}>#{value}</Link> : '—'; return column; }
  if (fl.name === 'status') { column.render = (value: string) => <StatusChip value={value} />; return column; }
  if (isTitleWithExcerpt) {
    column.render = (_: any, r: any) => (
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[fl.name]}</div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{excerpt(r[res.excerpt!])}</Text>
      </div>);
    return column;
  }
  // Résolu côté serveur (join sur users, voir joinUser dans l'API) : nom/e-mail plutôt que l'UUID brut.
  if (fl.name === 'user_id') {
    column.render = (v: string, r: any) => r.user_name || r.user_email || v || '—';
    return column;
  }
  switch (fl.type) {
    // Coche pleine plutôt qu'une pastille (lue comme « désactivé » par contraste trop faible avec le vert
    // de marque) — un simple vrai/faux n'a pas besoin d'un badge, juste d'un signe reconnaissable.
    case 'bool': column.render = (v: any) => (v ? <CheckOutlined style={{ color: 'var(--ant-color-success)', fontSize: 15 }} /> : <Text type="secondary">—</Text>); break;
    case 'int': case 'num': column.render = (v: any) => (v == null ? '—' : Number(v).toLocaleString('fr-FR')); break;
    case 'date': column.render = (v: any) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—'); break;
    case 'ts': column.render = (v: any) => <RelativeDate value={v} />; break;
    case 'json': column.render = (v: any) => (v == null ? '—' : JSON.stringify(v).slice(0, 60)); break;
    case 'texts': column.render = (v: any) => (v || []).join(', ') || '—'; break;
    case 'country': column.render = (v: any) => (v === 'ALL' ? 'Tous' : v || '—'); break;
    case 'species': column.render = (v: any) => species.find((s) => s.value === v)?.label || v || '—'; break;
    case 'discount': column.render = (v: any, r: any) => (v != null ? `${v} %` : r.amount_off_mga != null ? `${Number(r.amount_off_mga).toLocaleString('fr-FR')} MGA` : '—'); break;
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
// Paires clé → nombre (ex. délais de registre en jours) : remplace un textarea JSON où une virgule oubliée
// casse l'écran. Les clés sont libres (chaque registre a les siennes), donc pas de champs figés par nom.
function KvNumInput({ value, onChange, keyPlaceholder }: { value?: Record<string, number>; onChange?: (v: Record<string, number>) => void; keyPlaceholder?: string }) {
  const rows = Object.entries(value || {});
  const set = (next: [string, number][]) => onChange?.(Object.fromEntries(next.filter(([k]) => k.trim())));
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map(([k, n], i) => (
        <Space key={i}>
          <Input value={k} placeholder={keyPlaceholder || 'clé'} style={{ width: 220 }}
            onChange={(e) => { const next = [...rows]; next[i] = [e.target.value, n]; set(next); }} />
          <InputNumber value={n} style={{ width: 120 }} onChange={(v) => { const next = [...rows]; next[i] = [k, v ?? 0]; set(next); }} />
          <Button type="text" danger size="small" onClick={() => set(rows.filter((_, j) => j !== i))}>Retirer</Button>
        </Space>
      ))}
      <Button size="small" onClick={() => set([...rows, ['', 0]])}>Ajouter</Button>
    </Space>
  );
}

// Motif + testeur en direct : on tape un numéro et on voit tout de suite s'il correspond, plutôt que de
// deviner si l'expression régulière est correcte en la relisant.
function RegexField({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [sample, setSample] = useState('');
  let ok: boolean | null = null;
  if (value && sample) { try { ok = new RegExp(value).test(sample); } catch { ok = false; } }
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} placeholder="^\d{6,15}$" />
      <Space>
        <Input value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Tester avec un numéro" style={{ width: 220 }} />
        {sample ? (ok ? <Text type="success" style={{ fontSize: 12.5 }}>✓ Correspond</Text> : <Text type="danger" style={{ fontSize: 12.5 }}>✗ Ne correspond pas</Text>) : null}
      </Space>
    </Space>
  );
}

// Niveaux + conseil par niveau, dans un seul éditeur — remplace deux zones JSON brutes (un niveau =
// une position dans « levels », l'app y accède par index ; « advice » est géré en parallèle via le
// formulaire directement, sans Form.Item visible pour lui, pour ne pas dupliquer l'édition).
function CheckupLevelsField({ value, onChange }: { value?: string[]; onChange?: (v: string[]) => void }) {
  const form = Form.useFormInstance();
  const advice: Record<string, string> = Form.useWatch('advice', form) || {};
  const levels: string[] = Array.isArray(value) ? value : [];
  const setRow = (i: number, newLabel: string, adviceText: string) => {
    const oldLabel = levels[i];
    onChange?.(levels.map((l, j) => (j === i ? newLabel : l)));
    const nextAdvice = { ...advice }; delete nextAdvice[oldLabel];
    if (adviceText.trim()) nextAdvice[newLabel] = adviceText;
    form.setFieldValue('advice', nextAdvice);
  };
  const removeRow = (i: number) => {
    const nextAdvice = { ...advice }; delete nextAdvice[levels[i]];
    onChange?.(levels.filter((_, j) => j !== i));
    form.setFieldValue('advice', nextAdvice);
  };
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {levels.map((l, i) => (
        <Space key={i} align="start">
          <Input value={l} placeholder="Niveau" style={{ width: 170 }} onChange={(e) => setRow(i, e.target.value, advice[l] || '')} />
          <Input value={advice[l] || ''} placeholder="Conseil (optionnel)" style={{ width: 380 }} onChange={(e) => setRow(i, l, e.target.value)} />
          <Button type="text" danger size="small" onClick={() => removeRow(i)}>Retirer</Button>
        </Space>
      ))}
      <Button size="small" onClick={() => onChange?.([...levels, ''])}>Ajouter un niveau</Button>
    </Space>
  );
}

// Seules les listes de type « Activité » portent une métadonnée (MET, pour le calcul calorique) — pour
// les autres, rien à éditer. Lit le type de liste en train d'être choisi dans le même formulaire.
function ListMetaField({ value, onChange }: { value?: any; onChange?: (v: any) => void }) {
  const form = Form.useFormInstance();
  const listType = Form.useWatch('list_type', form);
  if (listType !== 'activity') return <Text type="secondary" style={{ fontSize: 12.5 }}>Pas de métadonnée pour ce type de liste.</Text>;
  return (
    <Space>
      <Text style={{ fontSize: 13 }}>MET (équivalent métabolique)</Text>
      <InputNumber value={value?.met} step="any" min={0} onChange={(v) => onChange?.(v == null ? {} : { met: v })} />
    </Space>
  );
}

// Pourcentage et montant fixe sont les deux façons de réduire un prix — jamais les deux à la fois. Un
// sélecteur de mode plutôt que deux champs remplissables en parallèle, qui permettait l'incohérence.
function DiscountField({ value, onChange }: { value?: number | null; onChange?: (v: number | null) => void }) {
  const form = Form.useFormInstance();
  const amountOff: number | null = Form.useWatch('amount_off_mga', form);
  const kind = amountOff != null && value == null ? 'amount' : 'percent';
  return (
    <Space>
      <Select value={kind} style={{ width: 170 }} onChange={(k) => { if (k === 'percent') form.setFieldValue('amount_off_mga', null); else onChange?.(null); }}
        options={[{ value: 'percent', label: 'Pourcentage' }, { value: 'amount', label: 'Montant fixe' }]} />
      {kind === 'percent'
        ? <InputNumber value={value ?? undefined} min={1} max={100} addonAfter="%" onChange={(v) => onChange?.(v ?? null)} />
        : <InputNumber value={amountOff ?? undefined} min={1} addonAfter="MGA" onChange={(v) => form.setFieldValue('amount_off_mga', v ?? null)} />}
    </Space>
  );
}

function FieldInput({ fl, isEdit, res, countries, species, ...field }: { fl: Field; isEdit: boolean; res: Res; countries: { value: string; label: string }[]; species: { value: string; label: string }[] } & Record<string, any>) {
  const disabled = fl.readOnly || (isEdit && !!res.createPk && fl.name === res.fields[0].name);
  switch (fl.type) {
    case 'html': return <RichTextEditor {...field} />;
    case 'longtext': return <Input.TextArea {...field} autoSize={{ minRows: 3 }} disabled={disabled} />;
    case 'int': return <InputNumber {...field} style={{ width: '100%' }} step={1} disabled={disabled}
      formatter={(v) => (v == null ? '' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))} parser={(v) => (v ? v.replace(/[^\d-]/g, '') : '') as any} />;
    case 'num': return <InputNumber {...field} style={{ width: '100%' }} step="any" disabled={disabled} />;
    case 'bool': return <Switch {...field} disabled={disabled} />;
    case 'date': return <DatePicker {...field} style={{ width: '100%' }} format="YYYY-MM-DD" disabled={disabled} />;
    case 'ts': return <DatePicker {...field} style={{ width: '100%' }} showTime format="YYYY-MM-DD HH:mm" disabled={disabled} />;
    case 'json': return <Input.TextArea {...field} autoSize={{ minRows: 4 }} disabled={disabled} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />;
    case 'kvnum': return <KvNumInput {...field} keyPlaceholder={fl.help} />;
    case 'regex': return <RegexField {...field} />;
    case 'checkupLevels': return <CheckupLevelsField {...field} />;
    case 'listMeta': return <ListMetaField {...field} />;
    case 'discount': return <DiscountField {...field} />;
    case 'texts': return <TagsInput {...field} />;
    case 'country': return <Select {...field} options={countries} showSearch optionFilterProp="label" allowClear={!allowAll(res)} disabled={disabled} />;
    case 'species': return <Select {...field} options={species} showSearch optionFilterProp="label" allowClear disabled={disabled} />;
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
const WIDE_TYPES = new Set(['json', 'longtext', 'texts', 'html', 'kvnum', 'regex', 'checkupLevels', 'listMeta', 'discount']);

// ── Pré-remplit un nouvel événement à partir d'un lien externe (page Facebook, site d'une
// association…) : la page est lue côté serveur et résumée par l'IA (titre/description/date/lieu).
// Ne fait que remplir le formulaire — l'admin relit, corrige si besoin, puis enregistre normalement.
function EventLinkImport({ form, onImported }: { form: ReturnType<typeof Form.useForm>[0]; onImported: () => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    if (!url.trim()) return;
    setLoading(true); setError('');
    try {
      const { json } = await api<{ title: string; description: string; location: string; link: string; date: string | null }>('/events/extract', { method: 'POST', body: { url: url.trim() } });
      const patch: Record<string, any> = { title: json.title, description: json.description, location: json.location, link: json.link };
      if (json.date) { patch.recurring = false; patch.event_date = dayjs(json.date); patch.month = null; patch.day = null; }
      form.setFieldsValue(patch);
      onImported();
      message.success(json.date ? 'Champs pré-remplis — vérifie la date avant d’enregistrer.' : 'Champs pré-remplis — aucune date trouvée, à compléter.');
    } catch (e: any) { setError(e.message || 'Import impossible.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, padding: 16, background: 'var(--ant-color-fill-tertiary)' }}>
      <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Importer depuis un lien</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
        Colle le lien d'un événement Facebook ou d'un site — l'IA propose titre, description, date et lieu. À relire avant d'enregistrer.
      </Typography.Text>
      <Space.Compact style={{ width: '100%' }}>
        <Input placeholder="https://www.facebook.com/events/…" value={url} onChange={(e) => setUrl(e.target.value)} onPressEnter={run} disabled={loading} />
        <Button type="primary" loading={loading} onClick={run}>Extraire avec l'IA</Button>
      </Space.Compact>
      {error ? <Alert type="error" showIcon style={{ marginTop: 10 }} message={error} /> : null}
    </div>
  );
}

function FieldGroup({ title, fields, isEdit, res, countries, species, changed = [] }: { title?: string; fields: Field[]; isEdit: boolean; res: Res; countries: { value: string; label: string }[]; species: { value: string; label: string }[]; changed?: string[] }) {
  const form = Form.useFormInstance();
  return (
    <div>
      {title ? <div style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)', margin: '0 0 12px' }}>{title}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0 20px' }} className="field-grid">
        {fields.filter((fl) => !fl.hidden).map((fl) => (
          <Form.Item className={changed.includes(fl.name) ? 'changed-field' : undefined} key={fl.name} name={fl.name} label={label(fl)} valuePropName={fl.type === 'bool' ? 'checked' : 'value'}
            dependencies={fl.conditionalRequired ? [fl.conditionalRequired.field] : undefined}
            rules={[
              ...(fl.required ? [{ required: true, message: `${label(fl)} est requis` }] : []),
              ...(fl.conditionalRequired ? [{
                validator: async (_: unknown, value: unknown) => {
                  const other = form.getFieldValue(fl.conditionalRequired!.field);
                  if (other === fl.conditionalRequired!.equals && (value === undefined || value === null || value === '')) {
                    throw new Error(`${label(fl)} est requis`);
                  }
                },
              }] : []),
              ...(fl.urlCheck ? [{ type: 'url' as const, message: 'URL invalide (doit commencer par http:// ou https://)' }] : []),
            ]}
            extra={fl.help} style={WIDE_TYPES.has(fl.type || '') ? { gridColumn: '1 / -1' } : undefined}>
            <FieldInput fl={fl} isEdit={isEdit} res={res} countries={countries} species={species} />
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
  const oneOff = v?.recurring === false;
  const eventDateLabel = oneOff && v?.event_date ? new Date(v.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, padding: 16, background: 'var(--ant-color-fill-tertiary)' }}>
      {kind === 'tip' && v?.category ? <Pill label={CAT[v.category] || v.category} /> : null}
      {kind === 'event' ? (
        <div style={{ color: 'var(--ant-color-primary)', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
          {oneOff ? (eventDateLabel || 'Date à préciser') : <>{v?.day || '?'} {month || ''} · chaque année</>}
        </div>
      ) : null}
      <div style={{ fontWeight: 700, fontSize: 15, marginTop: kind === 'tip' && v?.category ? 8 : 0 }}>{v?.title || 'Titre'}</div>
      {kind === 'event' ? <div style={{ marginTop: 4, fontSize: 13.5 }}>{v?.description}</div>
        : <div className="cms-preview" style={{ marginTop: 4, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: sanitizeRich(v?.body || '') }} />}
      {kind === 'tip' ? <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>{v?.author || "App'lika"}{v?.vet_reviewed ? ' · relu par un vétérinaire' : ''}</Text> : null}
    </div>
  );
}

function GenericPreview({ res, v, species }: { res: Res; v: any; species: { value: string; label: string }[] }) {
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
              <Text style={{ fontSize: 13, textAlign: 'right', overflowWrap: 'anywhere' }}>
                {fl.type === 'species' ? (species.find((s) => s.value === v[fl.name])?.label || String(v[fl.name])) : String(v[fl.name])}
              </Text>
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

function FormToolbar({ res, isEdit, saving, onSave, onDelete }: { res: Res; isEdit: boolean; saving: boolean; onSave: (status?: string, stay?: boolean) => void; onDelete?: () => void }) {
  const st = statusField(res);
  const choices = toOptions(st?.choices).map((c) => String(c.value));
  const publish = choices.includes('publie') ? 'publie' : choices.includes('valide') ? 'valide' : null;
  // Supprimer est irréversible : séparé spatialement des actions de sauvegarde (pas seulement par la couleur)
  // pour qu'un clic rapide ne puisse pas l'atteindre par erreur en visant Enregistrer.
  // Collée en bas de l'écran (pas du formulaire) : sur un long formulaire, Enregistrer restait hors
  // champ tant qu'on n'avait pas tout fait défiler.
  return (
    <div style={{
      marginTop: 24, padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      position: 'sticky', bottom: 0, background: 'var(--ant-color-bg-layout)', borderTop: '1px solid var(--ant-color-border)', zIndex: 1,
    }}>
      <Space wrap>
        <Button type="primary" loading={saving} onClick={() => onSave()}>Enregistrer</Button>
        <Button loading={saving} onClick={() => onSave(undefined, true)}>Enregistrer et continuer</Button>
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

// Le lancement manuel complète le cron système. La confirmation avec motif précède tout envoi.
function JobsRunButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { const response = await api('/jobs/run', { method: 'POST', body: { reason } }); if (response.json.trackingError) message.warning('Exécution terminée, mais le suivi n’a pas pu être finalisé. Ne relance pas sans vérifier les envois.'); else message.success('Exécution terminée. Consulte le détail dans l’historique.'); setOpen(false); setReason(''); onDone(); }
    catch (e: any) { message.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Lancer maintenant</Button>
      <Modal open={open} onCancel={() => setOpen(false)} title="Lancer les rappels maintenant"
        footer={<><Button onClick={() => setOpen(false)}>Annuler</Button><Button type="primary" danger loading={busy} disabled={reason.trim().length < 5} onClick={run}>Confirmer</Button></>}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="warning" showIcon message="Envoie de vraies notifications (push/e-mail) à tous les comptes concernés, immédiatement." />
          <Input.TextArea placeholder="Motif (min. 5 caractères, journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
        </Space>
      </Modal>
    </>
  );
}

function ReadOnlyValue({ field, value }: { field: Field; value: any }) {
  if (value === undefined || value === null || value === '') return <>—</>;
  if (field.name === 'status') return <StatusChip value={value} />;
  switch (field.type) {
    case 'json': return <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(value, null, 2)}</pre>;
    case 'ts': return <>{new Date(value).toLocaleString('fr-FR')}</>;
    case 'date': return <>{new Date(value).toLocaleDateString('fr-FR')}</>;
    case 'select': return <>{toOptions(field.choices).find((choice) => String(choice.value) === String(value))?.label || String(value)}</>;
    case 'texts': return <>{value.join(', ') || '—'}</>;
    case 'bool': return <>{value ? 'Oui' : 'Non'}</>;
    case 'int': case 'num': return <>{Number(value).toLocaleString('fr-FR')}</>;
    default: return <>{String(value)}</>;
  }
}

export function makeResource(res: Res, perms: string[]) {
  const canWrite = !res.readOnly && permits(perms, res.write);
  const st = statusField(res);
  const stChoices = toOptions(st?.choices);
  const canImport = canWrite && IMPORTABLE.includes(res.name);
  const orderField = res.fields.find((x) => x.name === 'sort_order');
  const defaultSort = { field: orderField ? 'sort_order' : res.name === 'events' ? 'month' : res.excerpt ? 'id' : (res.fields.find((x) => x.list)?.name || 'id'), order: (['jobs', 'messages'].includes(res.name) ? 'DESC' : orderField ? 'ASC' : res.excerpt && res.name !== 'events' ? 'DESC' : 'ASC') as 'ASC' | 'DESC' };

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
    const species = useSpeciesChoices();
    const { page, pageSize, sort, filter, setSort, setFilter, paginate } = useListState(defaultSort);
    useListReturn(`/${res.name}`);
    const queryClient = useQueryClient();
    const { data, isFetching, error, refetch } = useResourceList(res.name, { page, perPage: pageSize, sort, filter });
    const statusCounts = useStatusCounts(res.name, filter, !!st);
    const [selected, setSelected] = useState<React.Key[]>([]);
    const updateMany = useUpdateMany(res.name);
    const reorder = useUpdate(res.name);
    const reordering = reorder.isPending;

    // Column choices are explicit and stable across pages, including empty fields.
    const columns = useMemo(() => {
      // Avec l'ordre manuel, la colonne numérique brute "Ordre" est remplacée par les flèches ci-dessous.
      const listFields = res.fields.filter((x) => x.list && x.name !== 'sort_order');
      const visible = listFields;
      return visible.map((fl, index) => {
        const column = listColumn(fl, res, countries, species);
        column.sortOrder = sort.field === fl.name ? (sort.order === 'ASC' ? 'ascend' : 'descend') : null;
        if (index === 0) {
          const render = column.render;
          column.render = (value: any, row: any) => <Link onClick={(event) => event.stopPropagation()} to={`/${res.name}/${row.id}${canWrite ? '' : '/show'}`}>{render ? render(value, row) : value}</Link>;
        }
        return column;
      });
    }, [countries, species, data, sort.field, sort.order]);
    // Signal discret qu'une ligne s'ouvre au clic (en plus du survol antd par défaut) — sans lui, rien ne
    // distingue une ligne cliquable d'un simple tableau de données.
    const chevronColumn = { title: '', key: '__chevron', width: 32, render: () => <RightOutlined style={{ color: 'var(--ant-color-text-quaternary)', fontSize: 12 }} /> };
    // Remplace le champ "Ordre" en formulaire : flèches monter/descendre, échangent sort_order avec la ligne
    // voisine de la page affichée et sauvegardent tout de suite (pas de glisser-déposer, plus simple et aussi fiable).
    const canReorder = canWrite && !!orderField && sort.field === 'sort_order';
    const rows = data?.data || [];
    const swap = (i: number, j: number) => {
      const a = rows[i]; const b = rows[j];
      if (!a || !b) return;
      reorder.mutate({ id: a.id, data: { sort_order: b.sort_order } });
      reorder.mutate({ id: b.id, data: { sort_order: a.sort_order } });
    };
    const reorderColumn = {
      title: 'Ordre', key: '__reorder', width: 76,
      render: (_: any, record: any, i: number) => (
        <Space size={2} onClick={(e) => e.stopPropagation()}>
          <Button type="text" size="small" disabled={reordering || i === 0} icon={<ArrowUpOutlined />} onClick={() => swap(i, i - 1)} aria-label="Monter" />
          <Button type="text" size="small" disabled={reordering || i === rows.length - 1} icon={<ArrowDownOutlined />} onClick={() => swap(i, i + 1)} aria-label="Descendre" />
        </Space>
      ),
    };

    const runBulk = async (status: string) => {
      try {
        let confirmedArchive = false;
        if (res.name === 'species' && status === 'archive') {
          const confirmation = await confirmSpeciesArchive(selected as string[]);
          if (confirmation === false) return;
          confirmedArchive = confirmation === 'confirmed';
        }
        updateMany.mutate({ ids: selected as (string | number)[], data: { status, ...(confirmedArchive ? { confirmArchive: true } : {}) } }, {
          onSuccess: () => { message.success(`${selected.length} élément(s) mis à jour`); setSelected([]); },
          onError: (e: any) => message.error(e.message),
        });
      } catch (error: any) { message.error(error.message); }
    };

    // Mode « console » : aucun SMTP configuré, les e-mails ne partent jamais réellement (même vers de
    // vraies adresses) — juste consignés dans les logs serveur. Signal visible, pas juste un statut discret.
    const hasConsoleMode = res.name === 'messages' && (data?.data || []).some((r: any) => r.status === 'console');
    const isJobs = res.name === 'jobs';
    return (
      <div style={{ padding: 24 }}>
        {hasConsoleMode ? <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="Aucun serveur SMTP configuré : les e-mails en « Simulé » ne sont pas envoyés, seulement consignés dans les logs." /> : null}
        {isJobs ? <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message="Historique des exécutions du job de rappels. Les compteurs correspondent aux traitements du job et ne garantissent pas la réception des notifications. Le lancement peut être manuel ou planifié via la crontab système. La configuration de l’hôte est à vérifier séparément." /> : null}
        <PageHeader title={isJobs ? 'Exécutions' : res.label} actions={
          <Space wrap>
            {isJobs && permits(perms, 'notifications.resend') ? <JobsRunButton onDone={() => invalidateResource(queryClient, 'jobs')} /> : null}
            <Button onClick={() => exportCsv(filter, sort)}>Exporter CSV</Button>
            {canImport ? <Button onClick={() => setImporting(true)}>Importer</Button> : null}
            {canWrite ? <Button type="primary" onClick={() => navigate(`/${res.name}/create`)}>Nouveau</Button> : null}
          </Space>} />
        {st ? (
          <Tabs activeKey={filter.status ?? ''} onChange={(k) => { setFilter({ ...filter, status: k || undefined }); }}
            items={[{ key: '', label: statusCounts.data ? `Tous (${statusCounts.data.total})` : 'Tous' }, ...stChoices.map((c) => ({ key: String(c.value), label: `${STATUS_PLURAL[String(c.value)] || c.label}${statusCounts.data ? ` (${statusCounts.data.counts[String(c.value)] || 0})` : ''}` }))]} />
        ) : null}
        {statusCounts.error ? <Alert type="warning" style={{ marginBottom: 12 }} message="Compteurs de statut indisponibles" action={<Button size="small" onClick={() => statusCounts.refetch()}>Réessayer</Button>} /> : null}
        <Space wrap style={{ marginBottom: 12 }}>
          {res.search ? <Input.Search key={String(filter.q || '')} defaultValue={filter.q} placeholder="Rechercher" allowClear style={{ width: 280 }} onSearch={(q) => { setFilter({ ...filter, q: q || undefined }); }} /> : null}
          {(res.filters || []).map((name) => {
            const fl = res.fields.find((x) => x.name === name)!;
            const options = fl.type === 'country' ? countries : fl.type === 'species' ? species : fl.type === 'bool' ? [{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }] : toOptions(fl.choices);
            return <Select key={name} placeholder={label(fl)} allowClear style={{ width: 180 }}
              options={options}
              value={filter[name]} onChange={(v) => { setFilter({ ...filter, [name]: v }); }} />;
          })}
          {canWrite && st && selected.length ? (
            <Space wrap>
              <Text type="secondary" style={{ fontSize: 13 }}>{selected.length} sélectionné(s) :</Text>
              {stChoices.map((c) => <Button key={String(c.value)} size="small" loading={updateMany.isPending} onClick={() => runBulk(String(c.value))}>{STATUS_ACTIONS[String(c.value)] || c.label}</Button>)}
            </Space>
          ) : null}
        </Space>
        {Object.entries(filter).some(([, value]) => value !== undefined && value !== '') ? <Space wrap style={{ marginBottom: 12 }}>
          {Object.entries(filter).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => <Tag key={key} closable onClose={() => { const next = { ...filter }; delete next[key]; setFilter(next); }}>
            {key === 'recent_days' ? `Derniers ${value} jours` : key === 'expiring_days' ? `Échéance sous ${value} jours` : key === 'job_run_id' ? `Exécution #${value}` : `${key === 'q' ? 'Recherche' : label(res.fields.find((field) => field.name === key) || { name: key })} : ${LABELS[String(value)] || value}`}
          </Tag>)}<Button size="small" onClick={() => setFilter({})}>Effacer les filtres</Button>
        </Space> : null}
        <QueryFeedback error={error} retry={refetch} />
        {!error && <ManagedTable tableKey={res.name} scroll={{ x: 'max-content' }} rowKey="id" dataSource={data?.data} columns={canReorder ? [...columns, reorderColumn, chevronColumn] : canWrite ? [...columns, chevronColumn] : columns} loading={isFetching}
          pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, pageSizeOptions: [25, 50, 100], onChange: paginate }}
          rowSelection={canWrite && st ? { selectedRowKeys: selected, onChange: setSelected } : undefined}
          onChange={(_p, _f, sorter: any, extra) => { if (extra.action === 'sort') setSort(sorter?.field && sorter?.order ? { field: sorter.field, order: sorter.order === 'ascend' ? 'ASC' : 'DESC' } : defaultSort); }}
          onRow={(record: any) => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/${res.name}/${record.id}${canWrite ? '' : '/show'}`) })}
          locale={{
            emptyText: Object.values(filter).some((v) => v !== undefined && v !== '') ? (
              <Empty description="Aucun résultat pour cette recherche." image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button size="small" onClick={() => { setFilter({}); }}>Effacer les filtres</Button>
              </Empty>
            ) : (
              <Empty description={`Aucune donnée pour l'instant.`} image={Empty.PRESENTED_IMAGE_SIMPLE}>
                {canWrite ? <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/${res.name}/create`)}>Ajouter — {res.label}</Button> : null}
              </Empty>
            ),
          }} />
        }
        {canImport ? <ImportDialog res={res} open={importing} onClose={() => setImporting(false)} /> : null}
      </div>
    );
  };

  const RShow = () => {
    const { id } = useParams();
    const { data: record, isLoading, error, refetch, isFetching } = useResourceOne(res.name, id);
    if (!record || error) return <QueryFeedback loading={isLoading} error={error} retry={refetch} />;
    const title = record.title || record.name || record.label || record.key || record.code || `${res.label} #${record.id}`;
    return (
      <div style={{ padding: 24 }}>
        <PageHeader title={String(title)} subtitle={res.label} back={{ label: res.label, to: `/${res.name}` }} actions={<Button loading={isFetching} onClick={() => refetch()}>Actualiser la fiche</Button>} />
        <div className="record-layout">
          <div className="record-main">
            {res.name === 'jobs' ? <JobDetails record={record} /> : null}
            {groupFields(res.fields.filter((field) => !field.hidden)).map((group, index) => <section className="admin-panel" key={index}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>{group.title || 'Informations'}</Typography.Title>
              {group.fields.map((field) => <div key={field.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 3fr)', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--ant-color-border)' }}>
                <Text type="secondary">{label(field)}</Text><div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><ReadOnlyValue field={field} value={record[field.name]} /></div>
              </div>)}
            </section>)}
          </div>
          <aside className="record-aside">
            <section className="admin-panel"><Typography.Title level={5} style={{ marginTop: 0 }}>Résumé</Typography.Title><GenericPreview res={res} v={record} species={[]} /></section>
            <RecordHistory resource={res.name} id={id!} />
          </aside>
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
    const species = useSpeciesChoices();
    const [form] = Form.useForm();
    const { data: record, isLoading, error, refetch } = useResourceOne(res.name, isEdit ? id : undefined);
    const create = useCreate(res.name);
    const update = useUpdate(res.name);
    const del = useDeleteOne(res.name);
    const groups = useMemo(() => groupFields(res.fields), []);
    const v = Form.useWatch([], form) || {};
    const original = React.useRef<Record<string, any>>({});
    const [changed, setChanged] = useState<string[]>([]);
    const [saveError, setSaveError] = useState('');
    const [validationErrors, setValidationErrors] = useState<any[]>([]);
    const dirty = changed.length > 0;

    useEffect(() => { if (isEdit && record && !dirty) { original.current = toFormValues(record, res); form.setFieldsValue(original.current); } }, [record]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!isEdit) { original.current = toFormValues(duplicateRecord || res.defaults || {}, res); form.setFieldsValue(original.current); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const slugTouched = React.useRef(false);
    const onValuesChange = (changed: any) => {
      if ('slug' in changed) slugTouched.current = true;
      if (res.name === 'pages' && !isEdit && 'title' in changed && !slugTouched.current) form.setFieldValue('slug', slugify(String(changed.title || '')));
      const values = form.getFieldsValue(true);
      setChanged(res.fields.filter((field) => JSON.stringify(values[field.name] ?? null) !== JSON.stringify(original.current[field.name] ?? null)).map((field) => field.name));
      setSaveError('');
    };

    const guard = useUnsavedChanges(dirty);
    const returnTo = useListReturn(`/${res.name}`);
    const saving = create.isPending || update.isPending;
    const submit = async (statusOverride?: string, stay = false) => {
      setSaveError(''); setValidationErrors([]);
      try {
        const values = await form.validateFields();
        const data = fromFormValues(values, res, statusOverride);
        if (res.name === 'species' && isEdit && data.status === 'archive' && record?.status !== 'archive') {
          const confirmation = await confirmSpeciesArchive([id!]);
          if (confirmation === false) return;
          if (confirmation === 'confirmed') data.confirmArchive = true;
        }
        const saved = isEdit ? await update.mutateAsync({ id: id!, data }) : await create.mutateAsync(data);
        message.success('Enregistré');
        original.current = toFormValues({ ...values, ...saved }, res);
        form.setFieldsValue(original.current); setChanged([]);
        if (stay && isEdit) return;
        guard.allowNavigation();
        navigate(stay ? `/${res.name}/${saved.id}` : returnTo, { replace: stay });
      } catch (e: any) {
        if (e?.errorFields) { setValidationErrors(e.errorFields); if (e.errorFields[0]) form.scrollToField(e.errorFields[0].name, { focus: true, block: 'center' }); return; }
        setSaveError(e.message || 'Échec de l’enregistrement.');
      }
    };
    const onDelete = async () => {
      try { await del.mutateAsync({ id: id! }); message.success('Supprimé'); guard.allowNavigation(); navigate(returnTo); }
      catch (e: any) { message.error(e.message); }
    };

    if (isEdit && (isLoading || error)) return <QueryFeedback loading={isLoading} error={error} retry={refetch} />;

    return (
      <div style={{ padding: 24 }}>
        <PageHeader title={`${res.label} — ${isEdit ? 'modifier' : 'nouveau'}`} back={{ label: res.label, to: `/${res.name}` }}
          actions={isEdit && record ? (
            <Button size="small" onClick={() => { const copy: any = { ...record }; delete copy.id; delete copy.published_at; if (copy.status) copy.status = res.defaults?.status || 'brouillon'; if (copy.title) copy.title = `${copy.title} (copie)`; if (copy.slug) copy.slug = `${copy.slug}-copie`; navigate(`/${res.name}/create`, { state: { record: copy } }); }}>Dupliquer</Button>
          ) : undefined} />
        {guard.dialog}
        {res.name === 'species' && isEdit ? <SpeciesUsage code={id} /> : null}
        {changed.length ? <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={`${changed.length} champ(s) modifié(s), non enregistré(s)`} description={changed.map((name) => label(res.fields.find((field) => field.name === name)!)).join(', ')} /> : null}
        {saveError ? <Alert type="error" showIcon style={{ marginBottom: 16 }} message="Enregistrement impossible" description={saveError} /> : null}
        {validationErrors.length ? <Alert type="error" showIcon style={{ marginBottom: 16 }} message="Corrige les champs signalés" description={<ul>{validationErrors.map((error) => <li key={error.name.join('.')}><Button type="link" onClick={() => form.scrollToField(error.name, { focus: true, block: 'center' })}>{error.errors.join(', ')}</Button></li>)}</ul>} /> : null}
        <Form form={form} disabled={saving} layout="vertical" onValuesChange={onValuesChange} style={{ width: '100%' }}>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0,2fr) minmax(300px,1fr)', alignItems: 'start' }} className="resource-form-grid">
            <div style={{ display: 'grid', gap: 24 }}>
              {res.reason ? <Form.Item name="reason" label="Motif (journalisé)" rules={[{ required: true, message: 'Motif requis' }]}><Input.TextArea autoSize={{ minRows: 2 }} /></Form.Item> : null}
              {res.name === 'events' && !isEdit ? <EventLinkImport form={form} onImported={() => onValuesChange({})} /> : null}
              {groups.map((g, i) => <FieldGroup key={i} title={g.title} fields={g.fields} isEdit={isEdit} res={res} countries={countries} species={species} changed={changed} />)}
            </div>
            <aside className="record-aside">
            <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ant-color-border)' }}>
                <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)' }}>Aperçu</span>
              </div>
              <div style={{ padding: 16 }}>
                {res.preview ? <ContentPreview kind={res.preview} v={v} /> : <GenericPreview res={res} v={v} species={species} />}
              </div>
            </div>
            {isEdit && id ? <RecordHistory resource={res.name} id={id} /> : null}
            </aside>
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
