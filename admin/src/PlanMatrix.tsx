import React, { useEffect, useState } from 'react';
import { useNotify, usePermissions, Title } from 'react-admin';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api, permits } from './api';
import { PageHeader, StatusChip } from './ui';

// Matrice « formule × fonctionnalité » : case = droit accordé, nombre = quota (vide = illimité). Tout est paramétrable.
// Interrupteur global : tant qu'il est éteint, tout le monde a accès à tout ; allumé, chaque compte sans abonnement est en « gratuit ».
function Enforcement({ canWrite }: { canWrite: boolean }) {
  const notify = useNotify();
  const [st, setSt] = useState<any>(null); const [open, setOpen] = useState(false); const [reason, setReason] = useState(''); const [ui, setUi] = useState('lock');
  const load = () => api('/enforcement').then((r) => setSt(r.json)).catch(() => undefined);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (st) setUi(st.gated_ui); }, [st]);
  if (!st) return null;
  const affected = st.over.animals + st.over.photos_count;
  const toggle = async () => {
    try { await api('/enforcement', { method: 'PUT', body: { enabled: !st.enforced, reason, gated_ui: ui } }); notify(st.enforced ? 'Formules désactivées : tout est ouvert' : 'Formules appliquées', { type: 'success' }); setOpen(false); setReason(''); load(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', p: 2, mb: 2.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 260 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: .5 }}>
          <Typography variant="subtitle2">Application des formules</Typography>
          <StatusChip value={st.enforced ? 'actif' : 'brouillon'} />
          {!st.enforced ? <Typography variant="caption" color="text.secondary">(tout est ouvert)</Typography> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {st.free_users} compte(s) sans abonnement seraient en formule Gratuit (limites : {st.limits.animals ?? '∞'} animal(aux), {st.limits.photos_count ?? '∞'} photos).
          {affected ? ` ${st.over.animals} dépassent la limite d'animaux, ${st.over.photos_count} celle des photos : leurs données restent visibles, mais ils ne pourront rien ajouter tant qu'ils n'ont pas de formule adaptée.` : ' Aucun compte ne dépasse ces limites.'}
        </Typography>
      </Box>
      {canWrite ? <Button variant={st.enforced ? 'outlined' : 'contained'} color={st.enforced ? 'warning' : 'primary'} onClick={() => setOpen(true)}>{st.enforced ? 'Désactiver' : 'Appliquer les formules'}</Button> : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{st.enforced ? 'Désactiver l\'application des formules' : 'Appliquer les formules à tous les utilisateurs'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {!st.enforced ? <Alert severity={affected ? 'warning' : 'info'} variant="outlined">Dès l'enregistrement, l'app et le serveur appliquent les droits et quotas de chaque formule. {affected ? `${affected} compte(s) dépassent déjà les limites du plan Gratuit.` : ''}</Alert> : <Alert severity="info" variant="outlined">Tout redevient accessible à tous, sans limite de formule.</Alert>}
          <TextField select label="Fonctionnalités hors formule dans l'app" value={ui} onChange={(e) => setUi(e.target.value)} helperText="Cadenas : visibles, un toucher propose de passer à une formule supérieure. Masquées : elles disparaissent des menus.">
            <MenuItem value="lock">Afficher avec un cadenas (recommandé)</MenuItem><MenuItem value="hide">Masquer</MenuItem>
          </TextField>
          <TextField label="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Annuler</Button><Button variant="contained" disabled={reason.trim().length < 5} onClick={toggle}>Confirmer</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

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
    <Box sx={{ p: 2.5, maxWidth: 1040 }}>
      <Title title="Matrice des droits" />
      <PageHeader title="Matrice des droits" subtitle="Ce que chaque formule inclut, et ses quotas." />
      <Enforcement canWrite={canWrite} />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField select size="small" label="Formule" value={code} onChange={(e) => setCode(e.target.value)} sx={{ minWidth: 220 }}>
          {plans.map((p) => <MenuItem key={p.code} value={p.code}>{p.name} — {Number(p.price_mga).toLocaleString('fr-FR')} MGA / {p.period}</MenuItem>)}
        </TextField>
        {canWrite ? <Button variant="contained" disabled={!dirty} onClick={save}>Enregistrer</Button> : null}
        {plan ? <Typography variant="caption" color="text.secondary">Prix, période et essai : ressource « Formules ». Application serveur : réglage <code>subscriptions_enforced</code>.</Typography> : null}
      </Stack>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <React.Fragment key={r.feature_code}>
            {i === 0 || rows[i - 1].category !== r.category ? (
              <Box sx={{ px: 2, py: .75, bgcolor: 'action.hover', borderBottom: 1, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}>
                <Typography variant="overline" color="text.secondary">{r.category || 'Autres'}</Typography>
              </Box>
            ) : null}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderBottom: i < rows.length - 1 ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2">{r.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'ui-monospace, monospace' }}>{r.feature_code}</Typography>
              </Box>
              <Checkbox checked={!!r.enabled} disabled={!canWrite} onChange={(e) => set(i, { enabled: e.target.checked })} size="small" />
              {r.kind === 'quota'
                ? <TextField size="small" type="number" disabled={!canWrite || !r.enabled} value={r.quota ?? ''} placeholder="Illimité" onChange={(e) => set(i, { quota: e.target.value === '' ? null : Number(e.target.value) })} sx={{ width: 120 }} />
                : <Box sx={{ width: 120 }} />}
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};
