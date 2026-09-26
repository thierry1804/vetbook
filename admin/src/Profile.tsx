import React, { useState } from 'react';
import { useGetIdentity, useNotify } from 'react-admin';
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, TextField, Typography } from '@mui/material';
import { api } from './api';
import { PageHeader } from './ui';

const strength = (p: string) => {
  let s = 0;
  if (p.length >= 12) s++; if (p.length >= 16) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

export const Profile = () => {
  const { data } = useGetIdentity() as any;
  const notify = useNotify();
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const s = strength(nw);
  const problem = nw && nw.length < 12 ? '12 caractères minimum' : again && again !== nw ? 'Les deux mots de passe diffèrent' : '';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setDone(false);
    try { await api('/auth/change-password', { method: 'POST', body: { current: cur, next: nw } }); setCur(''); setNw(''); setAgain(''); setDone(true); notify('Mot de passe modifié', { type: 'success' }); }
    catch (err: any) { notify(err.message, { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Box sx={{ p: 2, maxWidth: 720 }}>
      <PageHeader title="Mon profil" subtitle="Ton compte d'administration" />
      <Card sx={{ mb: 2 }}><CardContent sx={{ display: 'grid', gap: .5 }}>
        <Typography variant="h6">{data?.fullName}</Typography>
        <Typography color="text.secondary">{data?.email}</Typography>
        <Box><Chip size="small" color="primary" variant="outlined" label={data?.role} /></Box>
      </CardContent></Card>
      <Card><CardContent component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="h6">Changer le mot de passe</Typography>
        <Typography variant="body2" color="text.secondary">Les autres sessions ouvertes avec ce compte seront fermées. Le code à 6 chiffres reste inchangé.</Typography>
        {done ? <Alert severity="success">Mot de passe modifié. Les autres sessions ont été déconnectées.</Alert> : null}
        <TextField label="Mot de passe actuel" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        <TextField label="Nouveau mot de passe" type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" required error={!!problem && nw.length < 12} helperText={nw && nw.length < 12 ? problem : 'Astuce : une phrase de passe longue est plus sûre.'} />
        {nw ? <LinearProgress variant="determinate" value={s * 20} color={s >= 4 ? 'success' : s >= 3 ? 'warning' : 'error'} sx={{ height: 6, borderRadius: 3 }} /> : null}
        <TextField label="Confirmer le nouveau mot de passe" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required error={!!again && again !== nw} helperText={again && again !== nw ? problem : ' '} />
        <Box><Button type="submit" variant="contained" disabled={busy || !cur || nw.length < 12 || nw !== again}>Enregistrer</Button></Box>
      </CardContent></Card>
    </Box>
  );
};
