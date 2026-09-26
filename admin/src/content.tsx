import React, { useEffect, useState } from 'react';
import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField, FunctionField, Edit, Create, SimpleForm, TextInput, NumberInput, BooleanInput, SelectInput, ArrayInput,
  SimpleFormIterator, DateInput, DateTimeInput, SearchInput, Show, SimpleShowLayout, required, useListContext, useNotify, useRefresh, useUpdateMany, useRecordContext,
  Toolbar, SaveButton, ExportButton, DeleteWithConfirmButton, TopToolbar, CreateButton, useUnselectAll, useResourceContext,
} from 'react-admin';
import { useWatch, useFormContext } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { RichTextInput, RichTextInputToolbar, LevelSelect, FormatButtons, ListButtons, LinkButtons, QuoteButtons, ClearButtons } from 'ra-input-rich-text';
import { Alert, Box, Button, Card, CardContent, Chip, Tab, Tabs, Typography } from '@mui/material';
import { permits, api } from './api';
import { StatusChip, LABELS, sanitizeRich, textOf } from './ui';
import { Choice, Field, Res, label } from './resources';
import { ImportDialog, IMPORTABLE } from './ImportDialog';
import { toCsv, download } from './csv';

// ── Données d'aide : pays ouverts (réglage `open_countries`), mis en cache pour la session.
let metaCache: Promise<{ countries: { code: string; label: string }[] }> | null = null;
const loadMeta = () => (metaCache ||= api('/meta').then((r) => r.json).catch(() => { metaCache = null; return { countries: [] }; }));
const useCountryChoices = (withAll: boolean) => {
  const [c, setC] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { loadMeta().then((m) => setC([...(withAll ? [{ id: 'ALL', name: 'Tous les pays' }] : []), ...m.countries.map((x) => ({ id: x.code, name: x.label }))])); }, [withAll]);
  return c;
};

const toChoices = (choices: Choice[] = []): { id: any; name: string }[] => choices.map((c) => (typeof c === 'string' ? { id: c, name: LABELS[c] || c } : c));
const STATUS_ACTIONS: Record<string, string> = { publie: 'Publier', brouillon: 'Repasser en brouillon', archive: 'Archiver', valide: 'Valider', a_valider: 'Marquer à valider', actif: 'Activer', commercialise: 'Commercialisé', retire: 'Retirer' };
const statusField = (res: Res) => res.fields.find((f) => f.name === 'status' && f.type === 'select');
const allowAll = (res: Res) => res.defaults?.country === 'ALL';

// ── Bandeau « modifications non publiées » : le contenu n'atteint l'app qu'après publication d'une version.
function PendingBanner({ section }: { section?: string }) {
  const nav = useNavigate();
  const [st, setSt] = useState<any>(null);
  useEffect(() => { if (section) api('/release-status').then((r) => setSt(r.json)).catch(() => undefined); }, [section]);
  if (!section || !st || !st.changed?.[section]) return null;
  return (
    <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => nav('/releases')}>{st.draft_version ? `Voir le brouillon v${st.draft_version}` : 'Préparer une version'}</Button>}>
      Des modifications ne sont pas encore visibles dans l'application. {st.draft_version ? `Un brouillon (v${st.draft_version}) attend d'être publié.` : 'Crée une version puis fais-la publier (principe des quatre yeux).'}
    </Alert>
  );
}

// ── Onglets de statut (Tous / Publiés / Brouillons…)
function StatusTabs({ choices }: { choices: { id: string; name: string }[] }) {
  const { filterValues, setFilters, displayedFilters } = useListContext();
  const plural: Record<string, string> = { publie: 'Publiés', brouillon: 'Brouillons', archive: 'Archivés', valide: 'Validées', a_valider: 'À valider', actif: 'Actifs', commercialise: 'Commercialisés', retire: 'Retirés' };
  return (
    <Tabs value={filterValues.status ?? ''} onChange={(_, v) => setFilters({ ...filterValues, status: v || undefined }, displayedFilters)} sx={{ mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Tab value="" label="Tous" />
      {choices.map((c) => <Tab key={c.id} value={c.id} label={plural[c.id] || c.name} />)}
    </Tabs>
  );
}

// ── Actions groupées : changer le statut de la sélection.
function BulkStatus({ choices }: { choices: string[] }) {
  const resource = useResourceContext();
  const { selectedIds } = useListContext();
  const unselect = useUnselectAll(resource!); const notify = useNotify(); const refresh = useRefresh();
  const [update, { isPending }] = useUpdateMany();
  const run = (status: string) => update(resource!, { ids: selectedIds, data: { status } }, {
    onSuccess: () => { notify(`${selectedIds.length} élément(s) mis à jour`, { type: 'success' }); unselect(); refresh(); },
    onError: (e: any) => notify(e?.message || 'Échec', { type: 'error' }),
  });
  return <Box sx={{ display: 'flex', gap: 1 }}>{choices.map((s) => <Button key={s} size="small" disabled={isPending} onClick={() => run(s)}>{STATUS_ACTIONS[s] || s}</Button>)}</Box>;
}

const excerpt = (html: string, n = 110) => { const t = textOf(html); return t.length > n ? t.slice(0, n) + '…' : t; };

const listCell = (fl: Field, res: Res, choices: { id: string; name: string }[]) => {
  const p = { key: fl.name, source: fl.name, label: fl.short || label(fl) };
  if (fl.name === res.fields.find((x) => x.list)?.name && res.excerpt) {
    return <FunctionField {...p} render={(r: any) => (
      <Box sx={{ maxWidth: 520 }}>
        <Typography variant="body2" fontWeight={600} noWrap>{r[fl.name]}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{excerpt(r[res.excerpt!])}</Typography>
      </Box>)} />;
  }
  switch (fl.type) {
    case 'bool': return <BooleanField {...p} />;
    case 'int': case 'num': return <NumberField {...p} />;
    case 'date': return <DateField locales="fr-FR" {...p} />;
    case 'ts': return <DateField locales="fr-FR" {...p} showTime emptyText="—" />;
    case 'json': return <FunctionField {...p} render={(r: any) => JSON.stringify(r[fl.name] ?? null).slice(0, 60)} />;
    case 'texts': return <FunctionField {...p} render={(r: any) => (r[fl.name] || []).join(', ')} />;
    case 'country': return <FunctionField {...p} render={(r: any) => (r[fl.name] === 'ALL' ? 'Tous' : r[fl.name] || '—')} />;
    case 'select': return <FunctionField {...p} render={(r: any) => (fl.name === 'status' ? <StatusChip value={r.status} /> : (toChoices(fl.choices).find((c) => String(c.id) === String(r[fl.name]))?.name ?? r[fl.name] ?? '—'))} />;
    default: return <TextField {...p} />;
  }
};

const jsonFormat = (v: any) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const jsonParse = (v: string) => { try { return v === '' ? null : JSON.parse(v); } catch { return v; } };
const jsonValidate = (v: any) => (typeof v === 'string' && v !== '' ? 'JSON invalide' : undefined);

function FieldInput({ fl, isEdit, res, countries }: { fl: Field; isEdit: boolean; res: Res; countries: { id: string; name: string }[] }) {
  const p: any = { source: fl.name, label: label(fl), validate: fl.required ? required() : undefined, fullWidth: true, helperText: fl.help };
  if (fl.readOnly) p.disabled = true;
  if (isEdit && res.createPk && fl.name === res.fields[0].name) p.disabled = true;
  switch (fl.type) {
    case 'html': return <RichTextInput source={fl.name} label={label(fl)} fullWidth
      sx={{ '& .RaRichTextInput-editorContent': { border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' },
        '& .ProseMirror': { minHeight: 360, maxHeight: '60vh', overflowY: 'auto', p: 2, outline: 'none', fontSize: 16, lineHeight: 1.6, '& p': { my: 1 }, '& h2,& h3,& h4': { mt: 2, mb: 1 }, '& blockquote': { borderLeft: 3, borderColor: 'primary.main', pl: 2, ml: 0, color: 'text.secondary' } },
        '& .ProseMirror p.is-editor-empty:first-of-type::before': { color: 'text.disabled', content: 'attr(data-placeholder)', float: 'left', height: 0, pointerEvents: 'none' } }}
      toolbar={<RichTextInputToolbar><LevelSelect /><FormatButtons /><ListButtons /><LinkButtons /><QuoteButtons /><ClearButtons /></RichTextInputToolbar>} />;
    case 'longtext': return <TextInput {...p} multiline minRows={3} />;
    case 'int': case 'num': return <NumberInput {...p} step={fl.type === 'int' ? 1 : 'any'} />;
    case 'bool': return <BooleanInput {...p} validate={undefined} />;
    case 'date': return <DateInput {...p} />;
    case 'ts': return <DateTimeInput {...p} />;
    case 'json': return <TextInput {...p} multiline minRows={4} format={jsonFormat} parse={fl.lenient ? (v: string) => { const j = jsonParse(v); return j === null && v.trim() !== '' ? v : j; } : jsonParse} validate={fl.lenient ? undefined : jsonValidate} sx={{ fontFamily: 'monospace' }} />;
    case 'texts': return <ArrayInput source={fl.name} label={label(fl)}><SimpleFormIterator inline><TextInput source="" label={false} /></SimpleFormIterator></ArrayInput>;
    case 'country': return <SelectInput {...p} choices={countries} emptyText={allowAll(res) ? undefined : '—'} />;
    case 'select': return <SelectInput {...p} choices={toChoices(fl.choices)} emptyText="—" />;
    default: return <TextInput {...p} />;
  }
}

// ── Aperçu fidèle à l'app pendant la rédaction.
function LivePreview({ kind }: { kind: 'tip' | 'page' | 'event' }) {
  const v = useWatch() as any;
  const month = LABELS_MONTH[Number(v.month) - 1];
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}><CardContent>
      <Typography variant="overline" color="text.secondary">Aperçu dans l'application</Typography>
      <Card sx={{ mt: 1, maxWidth: 420 }}><CardContent>
        {kind === 'tip' && v.category ? <Chip size="small" label={CAT[v.category] || v.category} sx={{ mb: 1 }} /> : null}
        {kind === 'event' ? <Typography variant="caption" color="primary" fontWeight={700}>{v.day || '?'} {month || ''}{v.recurring ? ' · chaque année' : ''}</Typography> : null}
        <Typography variant="subtitle1" fontWeight={700}>{v.title || 'Titre'}</Typography>
        {kind === 'event' ? <Typography variant="body2">{v.description}</Typography>
          : <Box className="cms-preview" sx={{ '& p': { mt: 0, mb: 1 }, '& ul,& ol': { pl: 3, mt: 0 }, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: sanitizeRich(v.body || '') }} />}
        {kind === 'tip' ? <Typography variant="caption" color="text.secondary">{v.author || 'App\'lika'}{v.vet_reviewed ? ' · relu par un vétérinaire' : ''}</Typography> : null}
      </CardContent></Card>
    </CardContent></Card>
  );
}
const CAT: Record<string, string> = { sante: 'Santé', alimentation: 'Alimentation', education: 'Éducation', hygiene: 'Hygiène', comportement: 'Comportement' };
const LABELS_MONTH = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
function SlugSync() {
  const { setValue, formState } = useFormContext();
  const title = useWatch({ name: 'title' });
  useEffect(() => { if (!formState.dirtyFields.slug) setValue('slug', slugify(String(title || ''))); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function FormToolbar({ res, canDelete }: { res: Res; canDelete: boolean }) {
  const st = statusField(res); const rec = useRecordContext();
  const choices = toChoices(st?.choices).map((c) => String(c.id));
  const publish = choices.includes('publie') ? 'publie' : choices.includes('valide') ? 'valide' : null;
  return (
    <Toolbar sx={{ gap: 1, justifyContent: 'flex-start' }}>
      <SaveButton label="Enregistrer" />
      {publish ? <SaveButton label={publish === 'publie' ? 'Enregistrer et publier' : 'Enregistrer et valider'} variant="outlined" transform={(d: any) => ({ ...d, status: publish })} /> : null}
      <Box sx={{ flex: 1 }} />
      {rec?.id && canDelete ? <DeleteWithConfirmButton confirmTitle="Supprimer définitivement ?" confirmContent="Cette action est irréversible. Pour retirer un contenu sans le perdre, passe-le en « archivé »." mutationMode="pessimistic" /> : null}
    </Toolbar>
  );
}

const DuplicateButton = ({ res }: { res: Res }) => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const copy: any = { ...r }; delete copy.id; delete copy.published_at;
  if (copy.status) copy.status = res.defaults?.status || 'brouillon';
  if (copy.title) copy.title = `${copy.title} (copie)`;
  if (copy.slug) copy.slug = `${copy.slug}-copie`;
  return <Button component={Link} to={`/${res.name}/create`} state={{ record: copy }} size="small">Dupliquer</Button>;
};

export function makeResource(res: Res, perms: string[]) {
  const canWrite = !res.readOnly && permits(perms, res.write);
  const st = statusField(res);
  const stChoices = toChoices(st?.choices);

  const canImport = canWrite && IMPORTABLE.includes(res.name);
  // Export : mêmes colonnes que le modèle d'import (aller-retour possible via Excel).
  const exporter = (records: any[]) => {
    const cols = res.fields.filter((f) => !f.readOnly);
    const cell = (r: any, f: Field) => (Array.isArray(r[f.name]) ? r[f.name].join('|') : f.type === 'json' && r[f.name] != null ? JSON.stringify(r[f.name]) : r[f.name]);
    download(`${res.name}.csv`, toCsv([cols.map((c) => c.name), ...records.map((r) => cols.map((c) => cell(r, c)))]));
  };
  const RList = () => {
    const [importing, setImporting] = useState(false);
    const countries = useCountryChoices(allowAll(res));
    const filters = [
      ...(res.search ? [<SearchInput key="q" source="q" alwaysOn placeholder="Rechercher" />] : []),
      ...(res.filters || []).map((name) => {
        const fl = res.fields.find((x) => x.name === name)!;
        return <SelectInput key={name} source={name} label={label(fl)} alwaysOn choices={fl.type === 'country' ? countries : toChoices(fl.choices)} emptyText="Tous" />;
      }),
    ];
    return (
      <>
        <PendingBanner section={res.section} />
        {canImport ? <ImportDialog res={res} open={importing} onClose={() => setImporting(false)} /> : null}
        <List filters={filters} perPage={25} title={res.label} sort={{ field: res.name === 'events' ? 'month' : res.excerpt ? 'id' : (res.fields.find((x) => x.list)?.name || 'id'), order: res.excerpt && res.name !== 'events' ? 'DESC' : 'ASC' }}
          exporter={exporter}
          actions={<TopToolbar><ExportButton label="Exporter CSV" />{canImport ? <Button size="small" onClick={() => setImporting(true)}>Importer</Button> : null}{canWrite ? <CreateButton label="Nouveau" variant="contained" /> : null}</TopToolbar>}
          empty={false}>
          {st ? <StatusTabs choices={stChoices} /> : null}
          <Datagrid rowClick={canWrite ? 'edit' : 'show'} bulkActionButtons={canWrite && st ? <BulkStatus choices={stChoices.map((c) => String(c.id))} /> : false}>
            {res.fields.filter((x) => x.list).map((fl) => listCell(fl, res, countries))}
          </Datagrid>
        </List>
      </>
    );
  };

  const RShow = () => <Show><SimpleShowLayout>{res.fields.map((fl) => listCell(fl, res, []))}</SimpleShowLayout></Show>;

  const Form = ({ isEdit }: { isEdit: boolean }) => {
    const countries = useCountryChoices(allowAll(res));
    const side = res.fields.filter((x) => x.side); const main = res.fields.filter((x) => !x.side);
    const two = side.length > 0;
    const inputs = (fs: Field[]) => fs.map((fl) => {
      const wide = ['json', 'longtext', 'texts', 'html'].includes(fl.type || '');
      return <Box key={fl.name} sx={wide && !two ? { gridColumn: '1 / -1' } : undefined}><FieldInput fl={fl} isEdit={isEdit} res={res} countries={countries} /></Box>;
    });
    return (
      <SimpleForm sx={{ maxWidth: two ? 1240 : 980 }} defaultValues={isEdit ? undefined : res.defaults} toolbar={<FormToolbar res={res} canDelete={!!res.deletable} />} warnWhenUnsavedChanges>
        {res.name === 'pages' && !isEdit ? <SlugSync /> : null}
        {two ? (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 340px' }, width: '100%', alignItems: 'start' }}>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {inputs(main)}
              {res.preview ? <LivePreview kind={res.preview} /> : null}
            </Box>
            <Card variant="outlined" sx={{ position: { lg: 'sticky' }, top: 72 }}><CardContent sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="overline" color="text.secondary">Paramètres</Typography>
              {inputs(side)}
            </CardContent></Card>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, width: '100%', alignItems: 'start' }}>
            {res.reason ? <Box sx={{ gridColumn: '1 / -1' }}><TextInput source="reason" label="Motif (journalisé)" validate={required()} fullWidth /></Box> : null}
            {inputs(res.fields)}
          </Box>
        )}
      </SimpleForm>
    );
  };
  const REdit = () => <><PendingBanner section={res.section} /><Edit mutationMode="pessimistic" actions={<TopToolbar><DuplicateButton res={res} /></TopToolbar>} title={`${res.label} — modifier`}><Form isEdit /></Edit></>;
  const RCreate = () => <Create redirect="list" title={`${res.label} — nouveau`}><Form isEdit={false} /></Create>;
  return { list: RList, show: res.readOnly || !canWrite ? RShow : undefined, edit: canWrite ? REdit : undefined, create: canWrite ? RCreate : undefined };
}
export { RES } from './resources';
