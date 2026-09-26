import React, { useEffect, useState } from 'react';
import { useNotify, usePermissions, Title } from 'react-admin';
import { Box, Button, Card, CardContent, Checkbox, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api, permits } from './api';

// Matrice « formule × fonctionnalité » : case = droit accordé, nombre = quota (vide = illimité). Tout est paramétrable.
export const PlanMatrix = () => {
  const { permissions } = usePermissions(); const notify = useNotify();
  const canWrite = permits(permissions, 'billing.plans_write');
  const [plans, setPlans] = useState<any[]>([]); const [code, setCode] = useState('');
  const [rows, setRows] = useState<any[]>([]); const [dirty, setDirty] = useState(false);
  useEffect(() => { api('/r/plans?range=[0,99]&sort=["sort_order","ASC"]').then((r) => { setPlans(r.json); if (r.json[0]) setCode(r.json[0].code); }).catch((e) => notify(e.message, { type: 'error' })); }, []);
  useEffect(() => { if (code) api(`/plans/${code}/features`).then((r) => { setRows(r.json); setDirty(false); }).catch((e) => notify(e.message, { type: 'error' })); }, [code]);
  const set = (i: number, patch: any) => { setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); };
  const save = async () => {
    try { await api(`/plans/${code}/features`, { method: 'PUT', body: { features: rows.map((r) => ({ feature_code: r.feature_code, enabled: !!r.enabled, quota: r.quota })) } }); notify('Matrice enregistrée'); setDirty(false); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };
  const plan = plans.find((p) => p.code === code);
  return (
    <Box sx={{ p: 2 }}>
      <Title title="Matrice des droits" />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Formule" value={code} onChange={(e) => setCode(e.target.value)} sx={{ minWidth: 220 }}>
          {plans.map((p) => <MenuItem key={p.code} value={p.code}>{p.name} — {Number(p.price_mga).toLocaleString('fr-FR')} MGA / {p.period}</MenuItem>)}
        </TextField>
        {canWrite ? <Button variant="contained" disabled={!dirty} onClick={save}>Enregistrer</Button> : null}
        {plan ? <Typography variant="body2" color="text.secondary">Prix, période et essai : ressource « Formules ». Application côté serveur : réglage <code>subscriptions_enforced</code>.</Typography> : null}
      </Box>
      <Card variant="outlined"><CardContent>
        <Table size="small">
          <TableHead><TableRow><TableCell>Fonctionnalité</TableCell><TableCell>Code</TableCell><TableCell align="center">Incluse</TableCell><TableCell>Quota (vide = illimité)</TableCell></TableRow></TableHead>
          <TableBody>{rows.map((r, i) => (
            <TableRow key={r.feature_code}>
              <TableCell>{r.label}</TableCell><TableCell><code>{r.feature_code}</code></TableCell>
              <TableCell align="center"><Checkbox checked={!!r.enabled} disabled={!canWrite} onChange={(e) => set(i, { enabled: e.target.checked })} /></TableCell>
              <TableCell>{r.kind === 'quota' ? <TextField size="small" type="number" disabled={!canWrite || !r.enabled} value={r.quota ?? ''} onChange={(e) => set(i, { quota: e.target.value === '' ? null : Number(e.target.value) })} /> : '—'}</TableCell>
            </TableRow>))}</TableBody>
        </Table>
      </CardContent></Card>
    </Box>
  );
};
