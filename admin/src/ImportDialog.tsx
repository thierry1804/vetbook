import React, { useMemo, useRef, useState } from 'react';
import { useNotify, useRefresh } from 'react-admin';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from './api';
import { Field, Res, label } from './resources';
import { download, parseCsv, toCsv } from './csv';
import { StatusChip } from './ui';

export const IMPORTABLE = ['tips', 'events', 'pages', 'clinics', 'emergency_numbers', 'breeds', 'vaccines'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const columnsOf = (res: Res) => res.fields.filter((f) => !f.readOnly);

const example = (f: Field): string => {
  const first = typeof f.choices?.[0] === 'string' ? (f.choices![0] as string) : (f.choices?.[0] as any)?.id;
  switch (f.type) {
    case 'html': case 'longtext': return 'Texte du contenu. Un retour à la ligne crée un nouveau paragraphe.';
    case 'int': return f.name === 'month' ? '3' : f.name === 'day' ? '15' : '1';
    case 'num': return '-18.8792';
    case 'bool': return 'oui';
    case 'country': return 'MG';
    case 'texts': return 'Canine|Féline';
    case 'select': return String(first ?? '');
    case 'date': return '2026-10-04';
    case 'json': return '{}';
    default: return f.name === 'phone' ? '020 22 000 00' : f.name === 'email' ? 'contact@exemple.mg' : 'Exemple';
  }
};

const STATUS_TEXT: Record<string, string> = { ok: 'À importer', doublon: 'Déjà présent', erreur: 'Erreur' };

export function ImportDialog({ res, open, onClose }: { res: Res; open: boolean; onClose: () => void }) {
  const notify = useNotify(); const refresh = useRefresh();
  const cols = useMemo(() => columnsOf(res), [res]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [report, setReport] = useState<any>(null);
  const [text, setText] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const step = done ? 2 : report ? 1 : 0;

  const reset = () => { setRows([]); setReport(null); setText(''); setError(''); setDone(null); };
  const close = () => { reset(); onClose(); };

  const template = () => download(`modele-${res.name}.csv`, toCsv([cols.map((c) => c.name), cols.map(example)]));

  const check = async (parsed: Record<string, string>[]) => {
    setBusy(true); setError('');
    try {
      const r = await api('/import/' + res.name, { method: 'POST', body: { rows: parsed } });
      setRows(parsed); setReport(r.json);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const load = async (content: string, isJson = false) => {
    setError('');
    try {
      let parsed: Record<string, string>[];
      if (isJson || /^\s*[\[{]/.test(content)) {
        const j = JSON.parse(content); const arr = Array.isArray(j) ? j : j.rows;
        if (!Array.isArray(arr)) throw new Error('Le JSON doit être une liste de lignes.');
        parsed = arr;
      } else {
        const table = parseCsv(content);
        if (table.length < 2) throw new Error('Le fichier doit contenir une ligne d\'en-têtes et au moins une ligne de données.');
        const byNorm = new Map<string, string>(); cols.forEach((c) => { byNorm.set(norm(c.name), c.name); byNorm.set(norm(label(c)), c.name); });
        const map = table[0].map((h) => byNorm.get(norm(h)));
        const unknown = table[0].filter((_, i) => !map[i] && table[0][i].trim());
        if (!map.some(Boolean)) throw new Error('Aucune colonne reconnue. Utilise le modèle CSV.');
        if (unknown.length) notify(`Colonnes ignorées : ${unknown.join(', ')}`, { type: 'warning' });
        parsed = table.slice(1).map((r) => { const o: Record<string, string> = {}; map.forEach((name, i) => { if (name && r[i] !== undefined) o[name] = r[i]; }); return o; });
      }
      if (!parsed.length) throw new Error('Aucune ligne trouvée.');
      if (parsed.length > 1000) throw new Error('Maximum 1000 lignes par import : découpe le fichier.');
      await check(parsed);
    } catch (e: any) { setError(e instanceof SyntaxError ? 'Fichier illisible (JSON invalide).' : e.message); }
  };

  const onFile = async (f?: File | null) => { if (!f) return; await load(await f.text(), f.name.toLowerCase().endsWith('.json')); if (fileRef.current) fileRef.current.value = ''; };

  const commit = async () => {
    setBusy(true); setError('');
    try { const r = await api('/import/' + res.name, { method: 'POST', body: { rows, commit: true } }); setDone(r.json); refresh(); notify(`${r.json.ok} élément(s) importé(s)`, { type: 'success' }); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const shown = cols.filter((c) => c.list).slice(0, 3);
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Importer — {res.label}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Stepper activeStep={step} alternativeLabel><Step><StepLabel>Fichier</StepLabel></Step><Step><StepLabel>Contrôle</StepLabel></Step><Step><StepLabel>Terminé</StepLabel></Step></Stepper>
        {error ? <Alert severity="error">{error}</Alert> : null}

        {step === 0 ? (
          <>
            <Alert severity="info">Format CSV (Excel : « Enregistrer sous → CSV ») ou JSON, 1 000 lignes maximum. Rien n'est publié par un import : les lignes arrivent en {res.name === 'clinics' ? '« à valider »' : 'brouillon'} ; les doublons sont ignorés.</Alert>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} disabled={busy}>Choisir un fichier</Button>
              <Button startIcon={<DownloadIcon />} onClick={template}>Télécharger le modèle CSV</Button>
              <input ref={fileRef} type="file" accept=".csv,.txt,.json,text/csv,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Colonnes : {cols.map((c) => c.name + (c.required ? '*' : '')).join(', ')}. Cases à cocher : oui/non. Listes : valeurs séparées par « | ». Pour le texte riche, un retour à la ligne crée un paragraphe (le HTML simple est accepté).
            </Typography>
            <TextField multiline minRows={5} label="…ou colle ici le contenu du CSV" value={text} onChange={(e) => setText(e.target.value)} inputProps={{ style: { fontFamily: 'ui-monospace, monospace', fontSize: 12 } }} />
            <Box><Button variant="outlined" disabled={!text.trim() || busy} onClick={() => load(text)}>Contrôler le texte collé</Button></Box>
          </>
        ) : null}

        {step === 1 && report ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip color="success" label={`${report.ok} à importer`} />
              <Chip color="warning" variant="outlined" label={`${report.duplicates} doublon(s) ignoré(s)`} />
              <Chip color={report.errors ? 'error' : 'default'} variant="outlined" label={`${report.errors} erreur(s)`} />
            </Box>
            {report.errors ? <Alert severity="warning">Les lignes en erreur ne seront pas importées ; corrige le fichier et recommence si besoin.</Alert> : null}
            <Box sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>#</TableCell>{shown.map((c) => <TableCell key={c.name}>{label(c)}</TableCell>)}<TableCell>Résultat</TableCell></TableRow></TableHead>
                <TableBody>{report.report.slice(0, 300).map((r: any, i: number) => (
                  <TableRow key={i} sx={r.status === 'erreur' ? { bgcolor: 'rgba(211,47,47,.06)' } : undefined}>
                    <TableCell>{r.row}</TableCell>
                    {shown.map((c) => <TableCell key={c.name} sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(rows[i]?.[c.name] ?? '').slice(0, 80)}</TableCell>)}
                    <TableCell>{r.status === 'erreur' ? <Typography variant="caption" color="error">{r.error}</Typography> : <Chip size="small" variant="outlined" color={r.status === 'ok' ? 'success' : 'warning'} label={STATUS_TEXT[r.status]} />}</TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            </Box>
            {report.report.length > 300 ? <Typography variant="caption" color="text.secondary">Aperçu des 300 premières lignes sur {report.total}.</Typography> : null}
          </>
        ) : null}

        {step === 2 && done ? (
          <Alert severity="success">
            {done.ok} élément(s) importé(s), {done.duplicates} doublon(s) ignoré(s), {done.errors} erreur(s). {res.section ? 'Pense à créer une version pour les rendre visibles dans l\'application.' : ''}
            {done.ok ? <> <StatusChip value={res.name === 'clinics' ? 'a_valider' : 'brouillon'} /></> : null}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        {step === 1 ? <Button onClick={reset} disabled={busy}>Changer de fichier</Button> : null}
        <Button onClick={close}>{step === 2 ? 'Fermer' : 'Annuler'}</Button>
        {step === 1 ? <Button variant="contained" disabled={busy || !report?.ok} onClick={commit}>Importer {report?.ok || 0} ligne(s)</Button> : null}
      </DialogActions>
    </Dialog>
  );
}
