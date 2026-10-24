import React, { useState } from 'react';
import {
  List, Datagrid, DateField, BooleanField, NumberField, SearchInput, SelectInput, useGetOne, useNotify, useRefresh, usePermissions, FunctionField,
} from 'react-admin';
import { useParams } from 'react-router-dom';
import {
  Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField as MuiText, Typography,
} from '@mui/material';
import { api, permits } from './api';
import { FactPanel, RowList, StatusChip } from './ui';

const mb = (b: number) => `${(b / 1e6).toFixed(1)} Mo`;
const initialsOf = (s: string) => String(s || '?').split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="E-mail, nom, téléphone, n° de puce ou de pedigree" sx={{ minWidth: 380 }} />,
  <SelectInput key="status" source="status" label="Statut" choices={[{ id: 'actif', name: 'Actif' }, { id: 'suspendu', name: 'Suspendu' }]} />,
  <SelectInput key="verified" source="verified" label="E-mail" choices={[{ id: 'true', name: 'Vérifié' }, { id: 'false', name: 'Non vérifié' }]} />,
  <SelectInput key="method" source="method" label="Méthode" choices={[{ id: 'google', name: 'Google' }, { id: 'email', name: 'E-mail' }]} />,
];

export const UserList = () => (
  <List filters={filters} perPage={25} sort={{ field: 'created_at', order: 'DESC' }} exporter={false} title="Utilisateurs">
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <FunctionField label="Utilisateur" render={(r: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: 12.5, fontWeight: 700, bgcolor: 'action.selected', color: 'text.primary' }}>{initialsOf(r.name || r.email)}</Avatar>
          <Box><Typography variant="body2" fontWeight={600}>{r.name || '—'}</Typography><Typography variant="caption" color="text.secondary">{r.email}</Typography></Box>
        </Box>)} />
      <FunctionField label="Statut" render={(r: any) => <StatusChip value={r.status} />} />
      <BooleanField source="google" label="Google" />
      <NumberField source="animals" label="Animaux" />
      <DateField locales="fr-FR" source="last_seen_at" label="Dernière activité" showTime />
      <DateField locales="fr-FR" source="created_at" label="Inscription" />
    </Datagrid>
  </List>
);

// Boîte de dialogue « action + motif » : le motif est obligatoire et journalisé côté serveur.
function ReasonDialog({ open, title, onClose, onSubmit, children }: { open: boolean; title: string; onClose: () => void; onSubmit: (reason: string) => Promise<void>; children?: React.ReactNode }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onSubmit(reason.trim()); setReason(''); onClose(); } finally { setBusy(false); } };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {children}
        <MuiText label="Motif (min. 5 caractères, journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} autoFocus />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={busy || reason.trim().length < 5} onClick={go}>Confirmer</Button></DialogActions>
    </Dialog>
  );
}


export const UserShow = () => {
  const { id } = useParams();
  const { data: u, refetch } = useGetOne('users', { id });
  const { permissions } = usePermissions();
  const notify = useNotify(); const refresh = useRefresh();
  const [dlg, setDlg] = useState<null | 'suspend' | 'reactivate' | 'logout-everywhere' | 'mark-verified' | 'subscription' | 'payment'>(null);
  const [plan, setPlan] = useState('premium'); const [subStatus, setSubStatus] = useState('actif'); const [endsAt, setEndsAt] = useState('');
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState('mvola'); const [ref, setRef] = useState('');
  // Le cache de la liste préremplit `u` avec une ligne partielle : on attend la fiche complète.
  if (!u || !Array.isArray(u.pets)) return null;
  const done = (msg: string) => { notify(msg); refetch(); refresh(); };
  const act = (name: string, ok: string) => async (reason: string) => {
    try { await api(`/users/${u.id}/${name}`, { method: 'POST', body: { reason } }); done(ok); } catch (e: any) { notify(e.message, { type: 'error' }); throw e; }
  };
  const canSuspend = permits(permissions, 'users.suspend'); const canSupport = permits(permissions, 'users.support'); const canBill = permits(permissions, 'billing.payment');
  const S = u.subscription;

  return (
    <Box sx={{ p: 2.5, display: 'grid', gap: 2, maxWidth: 1180 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Avatar sx={{ width: 44, height: 44, fontWeight: 700, bgcolor: 'action.selected', color: 'text.primary' }}>{initialsOf(u.name || u.email)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{u.name || u.email}</Typography>
          <Stack direction="row" spacing={.75} alignItems="center" sx={{ mt: .25 }}>
            <StatusChip value={u.status} />
            {u.email_verified_at ? null : <StatusChip value="a_valider" />}
            {u.google ? <Typography variant="caption" color="text.secondary">Google</Typography> : null}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {canSuspend && (u.status === 'suspendu' ? <Button size="small" variant="outlined" onClick={() => setDlg('reactivate')}>Réactiver</Button> : <Button size="small" variant="outlined" color="error" onClick={() => setDlg('suspend')}>Suspendre</Button>)}
          {canSupport ? <Button size="small" variant="outlined" onClick={() => setDlg('logout-everywhere')}>Déconnecter partout</Button> : null}
          {canSupport && !u.email_verified_at ? <Button size="small" variant="outlined" onClick={() => setDlg('mark-verified')}>Marquer vérifié</Button> : null}
          {canBill ? <Button size="small" variant="outlined" onClick={() => setDlg('subscription')}>Attribuer une formule</Button> : null}
          {canBill && S ? <Button size="small" variant="outlined" onClick={() => setDlg('payment')}>Enregistrer un paiement</Button> : null}
        </Stack>
      </Stack>

      {u.status === 'suspendu' ? (
        <Box sx={{ border: 1, borderColor: 'error.main', borderRadius: 2, px: 2, py: 1.25, bgcolor: 'rgba(154,68,51,.06)' }}>
          <Typography variant="body2">Suspendu {u.suspended_at ? `le ${new Date(u.suspended_at).toLocaleString('fr-FR')}` : ''} — {u.suspension_reason}</Typography>
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' } }}>
        <FactPanel title="Compte" rows={[
          ['E-mail', u.email], ['Téléphone', u.phone || '—'], ['Langue', u.locale || '—'], ['Inscription', u.created_at && new Date(u.created_at).toLocaleString('fr-FR')],
          ['CGU acceptées', u.terms_version ? `v${u.terms_version}` : '—'], ['Contact d\'urgence', u.emergency_contact ? JSON.stringify(u.emergency_contact) : '—'],
          ['Formule', S ? `${S.plan_code} (${S.status}${S.ends_at ? ' → ' + new Date(S.ends_at).toLocaleDateString('fr-FR') : ''})` : 'aucune'],
          ['Stockage photos', mb(u.storage_bytes)], ['Membres du foyer', String(u.household_members)], ['Liens de partage', String(u.share_links)], ['Appareils notifiés', String(u.push_subscriptions)],
        ]} />
        <RowList title="Animaux" count={u.pets.length} empty="Aucun animal enregistré."
          rows={u.pets.map((p: any) => (
            <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{p.species} · {p.race} · {p.sex}</Typography>
            </Stack>))} />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <RowList title="Sessions actives" count={u.sessions.length} empty="Aucune session ouverte."
          rows={u.sessions.map((s: any) => (
            <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>{String(s.user_agent || '—').slice(0, 44)}</Typography>
                <Typography variant="caption" color="text.secondary">{s.ip}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 'none' }}>{new Date(s.last_seen_at).toLocaleString('fr-FR')}</Typography>
            </Stack>))} />
        <RowList title="Historique des actions admin" count={u.audit.length} empty="Aucune action enregistrée."
          rows={u.audit.map((a: any) => (
            <Box key={a.id}>
              <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" fontWeight={600} noWrap>{a.action}</Typography><Typography variant="caption" color="text.secondary" sx={{ flex: 'none' }}>{new Date(a.created_at).toLocaleString('fr-FR')}</Typography></Stack>
              <Typography variant="caption" color="text.secondary">{a.admin_email}{a.reason ? ` — ${a.reason}` : ''}</Typography>
            </Box>))} />
      </Box>

      <ReasonDialog open={dlg === 'suspend'} title="Suspendre le compte" onClose={() => setDlg(null)} onSubmit={act('suspend', 'Compte suspendu')} />
      <ReasonDialog open={dlg === 'reactivate'} title="Réactiver le compte" onClose={() => setDlg(null)} onSubmit={act('reactivate', 'Compte réactivé')} />
      <ReasonDialog open={dlg === 'logout-everywhere'} title="Déconnecter toutes les sessions" onClose={() => setDlg(null)} onSubmit={act('logout-everywhere', 'Sessions invalidées')} />
      <ReasonDialog open={dlg === 'mark-verified'} title="Marquer l'e-mail comme vérifié" onClose={() => setDlg(null)} onSubmit={act('mark-verified', 'E-mail marqué vérifié')} />
      <ReasonDialog open={dlg === 'subscription'} title="Attribuer une formule" onClose={() => setDlg(null)}
        onSubmit={async (reason) => {
          try { await api(`/users/${u.id}/subscription`, { method: 'POST', body: { reason, plan_code: plan, status: subStatus, ends_at: endsAt || null } }); done('Formule attribuée'); } catch (e: any) { notify(e.message, { type: 'error' }); throw e; }
        }}>
        <MuiText label="Code de la formule" value={plan} onChange={(e) => setPlan(e.target.value)} helperText="gratuit, premium, eleveur, cabinet…" />
        <MuiText select label="Statut" value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>{['essai', 'actif', 'en_retard', 'suspendu'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</MuiText>
        <MuiText label="Fin de validité" type="date" InputLabelProps={{ shrink: true }} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </ReasonDialog>
      <ReasonDialog open={dlg === 'payment'} title="Enregistrer un paiement (reçu généré)" onClose={() => setDlg(null)}
        onSubmit={async (reason) => {
          try { const r = await api(`/subscriptions/${S.id}/payments`, { method: 'POST', body: { reason, amount_mga: Number(amount), method, reference: ref || null } }); done(`Paiement enregistré — facture ${r.json.invoice.number}`); } catch (e: any) { notify(e.message, { type: 'error' }); throw e; }
        }}>
        <MuiText label="Montant (MGA)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <MuiText select label="Moyen" value={method} onChange={(e) => setMethod(e.target.value)}>{['mvola', 'orange_money', 'airtel_money', 'carte', 'especes'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</MuiText>
        <MuiText label="Référence de transaction" value={ref} onChange={(e) => setRef(e.target.value)} />
      </ReasonDialog>
    </Box>
  );
};
