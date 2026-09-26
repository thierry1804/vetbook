import React, { useEffect, useState } from 'react';
import {
  List, Datagrid, TextField, DateField, FunctionField, TopToolbar, useNotify, useRefresh, useGetOne, useRedirect, CreateButton,
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Table, TableBody, TableCell, TableRow, TextField as Mui, Typography,
} from '@mui/material';
import { api } from './api';
import { CredentialsDialog, PageHeader, StatusChip } from './ui';

type Role = { code: string; label: string; permissions: string[] };
const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  useEffect(() => { api<Role[]>('/roles').then((r) => setRoles(r.json)).catch(() => undefined); }, []);
  return roles;
};
const roleLabel = (roles: Role[], code: string) => roles.find((r) => r.code === code)?.label || code;
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const AdminList = () => {
  const roles = useRoles();
  return (
    <List actions={<TopToolbar><CreateButton label="Nouvel administrateur" /></TopToolbar>} pagination={false} exporter={false} sort={{ field: 'created_at', order: 'ASC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <FunctionField label="Administrateur" render={(r: any) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>{initials(r.name || r.email)}</Avatar>
            <Box><Typography variant="body2" fontWeight={600}>{r.name}</Typography><Typography variant="caption" color="text.secondary">{r.email}</Typography></Box>
          </Box>)} />
        <FunctionField label="Rôle" render={(r: any) => <Chip size="small" color="primary" variant="outlined" label={roleLabel(roles, r.role_code)} />} />
        <FunctionField label="Statut" render={(r: any) => (r.locked_until && new Date(r.locked_until) > new Date() ? <StatusChip value="suspendu" /> : <StatusChip value={r.status} />)} />
        <DateField locales="fr-FR" source="last_login_at" label="Dernière connexion" showTime emptyText="Jamais" />
        <DateField locales="fr-FR" source="created_at" label="Créé le" />
      </Datagrid>
    </List>
  );
};

export const AdminCreate = () => {
  const roles = useRoles(); const notify = useNotify(); const redirect = useRedirect();
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState('support');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/admins', { method: 'POST', body: { email, name, role_code: role } }); setCreated(r.json); }
    catch (err: any) { notify(err.message, { type: 'error' }); } finally { setBusy(false); }
  };
  const perms = roles.find((r) => r.code === role)?.permissions || [];
  return (
    <Box sx={{ p: 2, maxWidth: 760 }}>
      <PageHeader title="Nouvel administrateur" subtitle="Un mot de passe provisoire et un code TOTP sont générés : à transmettre à la personne." />
      <Card><CardContent component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
        <Mui label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
        <Mui label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Mui select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => <MenuItem key={r.code} value={r.code}>{r.label}</MenuItem>)}
        </Mui>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .75 }}>
          {perms.slice(0, 40).map((p) => <Chip key={p} size="small" label={p === '*' ? 'Tous les droits' : p} variant="outlined" />)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}><Button type="submit" variant="contained" disabled={busy}>Créer le compte</Button><Button onClick={() => redirect('/admins')}>Annuler</Button></Box>
      </CardContent></Card>
      <CredentialsDialog creds={created?.credentials || null} email={created?.email || ''} title="Compte créé" onClose={() => redirect(`/admins/${created.id}/show`)} />
    </Box>
  );
};

export const AdminShow = () => {
  const { id } = useParams(); const nav = useNavigate();
  const roles = useRoles(); const notify = useNotify(); const refresh = useRefresh();
  const { data: a, refetch } = useGetOne('admins', { id });
  const [dlg, setDlg] = useState<null | 'edit' | 'reset' | 'revoke'>(null);
  const [reason, setReason] = useState(''); const [role, setRole] = useState(''); const [status, setStatus] = useState(''); const [name, setName] = useState('');
  const [creds, setCreds] = useState<any>(null);
  useEffect(() => { if (a) { setRole(a.role_code); setStatus(a.status); setName(a.name); } }, [a]);
  if (!a || !Array.isArray(a.sessions)) return null;
  const close = () => { setDlg(null); setReason(''); };
  const run = async (fn: () => Promise<any>, ok: string) => { try { const r = await fn(); notify(ok, { type: 'success' }); close(); refetch(); refresh(); return r; } catch (e: any) { notify(e.message, { type: 'error' }); } };
  const locked = a.locked_until && new Date(a.locked_until) > new Date();
  return (
    <Box sx={{ p: 2, display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button onClick={() => nav('/admins')} size="small">← Administrateurs</Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main' }}>{initials(a.name || a.email)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h5">{a.name}</Typography>
          <Typography color="text.secondary">{a.email}</Typography>
        </Box>
        <Chip color="primary" variant="outlined" label={roleLabel(roles, a.role_code)} />
        <StatusChip value={a.status} />
        {locked ? <Chip color="error" size="small" label="Verrouillé" /> : null}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => setDlg('edit')}>Modifier rôle / statut</Button>
        <Button variant="outlined" onClick={() => setDlg('reset')}>Réinitialiser mot de passe et 2FA</Button>
        <Button variant="outlined" onClick={() => setDlg('revoke')}>Fermer ses sessions</Button>
        {locked ? <Button variant="outlined" color="warning" onClick={() => run(() => api(`/admins/${a.id}/unlock`, { method: 'POST', body: {} }), 'Compte déverrouillé')}>Déverrouiller</Button> : null}
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Typography variant="subtitle1" gutterBottom>Sessions actives ({a.sessions.length})</Typography>
          <Table size="small"><TableBody>{a.sessions.map((s: any) => (
            <TableRow key={s.id}><TableCell>{new Date(s.created_at).toLocaleString('fr-FR')}</TableCell><TableCell>{s.ip}</TableCell><TableCell>{String(s.user_agent || '').slice(0, 40)}</TableCell></TableRow>))}
            {!a.sessions.length ? <TableRow><TableCell sx={{ color: 'text.secondary' }}>Aucune session ouverte.</TableCell></TableRow> : null}</TableBody></Table>
        </CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Typography variant="subtitle1" gutterBottom>Dernières actions</Typography>
          <Table size="small"><TableBody>{a.audit.map((x: any) => (
            <TableRow key={x.id}><TableCell>{new Date(x.created_at).toLocaleString('fr-FR')}</TableCell><TableCell>{x.action}</TableCell></TableRow>))}</TableBody></Table>
        </CardContent></Card></Grid>
      </Grid>

      <Dialog open={dlg === 'edit'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Modifier {a.name}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <Mui label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          <Mui select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <MenuItem key={r.code} value={r.code}>{r.label}</MenuItem>)}</Mui>
          <Mui select label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}><MenuItem value="actif">Actif</MenuItem><MenuItem value="desactive">Désactivé</MenuItem></Mui>
          <Alert severity="info">Changer le rôle ou désactiver le compte ferme ses sessions.</Alert>
          <Mui label="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions><Button onClick={close}>Annuler</Button><Button variant="contained" disabled={reason.trim().length < 5} onClick={() => run(() => api(`/admins/${a.id}`, { method: 'PUT', body: { name, role_code: role, status, reason } }), 'Compte mis à jour')}>Enregistrer</Button></DialogActions>
      </Dialog>
      <Dialog open={dlg === 'reset'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Réinitialiser les identifiants</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <Alert severity="warning">Un nouveau mot de passe provisoire et un nouveau secret TOTP seront générés ; l'ancien téléphone d'authentification ne fonctionnera plus.</Alert>
          <Mui label="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions><Button onClick={close}>Annuler</Button><Button variant="contained" color="warning" disabled={reason.trim().length < 5} onClick={async () => { const r = await run(() => api(`/admins/${a.id}/reset-credentials`, { method: 'POST', body: { reason } }), 'Identifiants réinitialisés'); if (r) setCreds(r.json.credentials); }}>Réinitialiser</Button></DialogActions>
      </Dialog>
      <Dialog open={dlg === 'revoke'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Fermer les sessions de {a.name}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}><Mui fullWidth label="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} /></DialogContent>
        <DialogActions><Button onClick={close}>Annuler</Button><Button variant="contained" disabled={reason.trim().length < 5} onClick={() => run(() => api(`/admins/${a.id}/revoke-sessions`, { method: 'POST', body: { reason } }), 'Sessions fermées')}>Fermer les sessions</Button></DialogActions>
      </Dialog>
      <CredentialsDialog creds={creds} email={a.email} title="Nouveaux identifiants" onClose={() => setCreds(null)} />
    </Box>
  );
};
