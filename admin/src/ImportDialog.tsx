import { useQueryClient } from '@tanstack/react-query';
import { invalidateResource } from './data';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Steps, Table, Tag, Typography, Input, message } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from './api';
import { Field, Res, label } from './resources';
import { download, parseCsv, toCsv } from './csv';
import { StatusChip } from './ui';

const { Text } = Typography;

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
  const cols = useMemo(() => columnsOf(res), [res]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [report, setReport] = useState<any>(null);
  const queryClient = useQueryClient();
  const [text, setText] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const step = done ? 2 : report ? 1 : 0;

  const reset = () => { setRows([]); setReport(null); setText(''); setError(''); setDone(null); };
  const close = () => { reset(); onClose(); };

  const template = () => download(`modele-${res.name}.csv`, toCsv([cols.map((c) => c.name), cols.map(example)]));

  const check = async (parsed: Record<string, string>[]) => {
    setBusy(true); setError('');
    try { const r = await api('/import/' + res.name, { method: 'POST', body: { rows: parsed } }); setRows(parsed); setReport(r.json); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const load = async (content: string, isJson = false) => {
    setError('');
    try {
      let parsed: Record<string, string>[];
      if (isJson || /^\s*[[{]/.test(content)) {
        const j = JSON.parse(content); const arr = Array.isArray(j) ? j : j.rows;
        if (!Array.isArray(arr)) throw new Error('Le JSON doit être une liste de lignes.');
        parsed = arr;
      } else {
        const table = parseCsv(content);
        if (table.length < 2) throw new Error("Le fichier doit contenir une ligne d'en-têtes et au moins une ligne de données.");
        const byNorm = new Map<string, string>(); cols.forEach((c) => { byNorm.set(norm(c.name), c.name); byNorm.set(norm(label(c)), c.name); });
        const map = table[0].map((h) => byNorm.get(norm(h)));
        const unknown = table[0].filter((_, i) => !map[i] && table[0][i].trim());
        if (!map.some(Boolean)) throw new Error('Aucune colonne reconnue. Utilise le modèle CSV.');
        if (unknown.length) message.warning(`Colonnes ignorées : ${unknown.join(', ')}`);
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
    try { const r = await api('/import/' + res.name, { method: 'POST', body: { rows, commit: true } }); setDone(r.json); invalidateResource(queryClient, res.name); message.success(`${r.json.ok} élément(s) importé(s)`); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const shown = cols.filter((c) => c.list).slice(0, 3);
  return (
    <Modal open={open} onCancel={close} width={760} title={`Importer — ${res.label}`}
      footer={<>
        {step === 1 ? <Button onClick={reset} disabled={busy}>Changer de fichier</Button> : null}
        <Button onClick={close}>{step === 2 ? 'Fermer' : 'Annuler'}</Button>
        {step === 1 ? <Button type="primary" loading={busy} disabled={!report?.ok} onClick={commit}>Importer {report?.ok || 0} ligne(s)</Button> : null}
      </>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Steps size="small" current={step} items={[{ title: 'Fichier' }, { title: 'Contrôle' }, { title: 'Terminé' }]} />
        {error ? <Alert type="error" message={error} showIcon /> : null}

        {step === 0 ? (
          <>
            <Alert type="info" showIcon message={`Format CSV (Excel : « Enregistrer sous → CSV ») ou JSON, 1 000 lignes maximum. Rien n'est publié par un import : les lignes arrivent en ${res.name === 'clinics' ? '« à valider »' : 'brouillon'} ; les doublons sont ignorés.`} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="primary" icon={<UploadOutlined />} onClick={() => fileRef.current?.click()} disabled={busy}>Choisir un fichier</Button>
              <Button icon={<DownloadOutlined />} onClick={template}>Télécharger le modèle CSV</Button>
              <input ref={fileRef} type="file" accept=".csv,.txt,.json,text/csv,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Colonnes : {cols.map((c) => c.name + (c.required ? '*' : '')).join(', ')}. Cases à cocher : oui/non. Listes : valeurs séparées par « | ». Pour le texte riche, un retour à la ligne crée un paragraphe (le HTML simple est accepté).
            </Text>
            <Input.TextArea autoSize={{ minRows: 5 }} placeholder="…ou colle ici le contenu du CSV" value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
            <div><Button disabled={!text.trim() || busy} onClick={() => load(text)}>Contrôler le texte collé</Button></div>
          </>
        ) : null}

        {step === 1 && report ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="success">{report.ok} à importer</Tag>
              <Tag color="warning">{report.duplicates} doublon(s) ignoré(s)</Tag>
              <Tag color={report.errors ? 'error' : 'default'}>{report.errors} erreur(s)</Tag>
            </div>
            {report.errors ? <Alert type="warning" showIcon message="Les lignes en erreur ne seront pas importées ; corrige le fichier et recommence si besoin." /> : null}
            <Table size="small" pagination={false} scroll={{ y: 360 }} rowKey={(_r, i) => String(i)}
              dataSource={report.report.slice(0, 300)}
              columns={[
                { title: '#', dataIndex: 'row', width: 48 },
                ...shown.map((c) => ({ title: label(c), key: c.name, render: (_: any, _r: any, i: number) => <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{String(rows[i]?.[c.name] ?? '').slice(0, 80)}</span> })),
                { title: 'Résultat', key: 'status', render: (r: any) => (r.status === 'erreur' ? <Text type="danger" style={{ fontSize: 12 }}>{r.error}</Text> : <Tag color={r.status === 'ok' ? 'success' : 'warning'}>{STATUS_TEXT[r.status]}</Tag>) },
              ]} />
            {report.report.length > 300 ? <Text type="secondary" style={{ fontSize: 12 }}>Aperçu des 300 premières lignes sur {report.total}.</Text> : null}
          </>
        ) : null}

        {step === 2 && done ? (
          <Alert type="success" showIcon message={<>
            {done.ok} élément(s) importé(s), {done.duplicates} doublon(s) ignoré(s), {done.errors} erreur(s). {res.section ? "Pense à créer une version pour les rendre visibles dans l'application." : ''}
            {done.ok ? <> <StatusChip value={res.name === 'clinics' ? 'a_valider' : 'brouillon'} /></> : null}
          </>} />
        ) : null}
      </div>
    </Modal>
  );
}
