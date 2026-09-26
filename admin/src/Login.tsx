import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';

export const LoginPage = () => {
  const login = useLogin(); const notify = useNotify();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await login({ username, password, totp: totp.replace(/\s/g, '') }); }
    catch (err: any) { notify(err?.message || 'Connexion impossible', { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f1ea', p: 2 }}>
      <Card sx={{ width: 380, maxWidth: '100%' }}>
        <CardContent component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h5">App'lika — Backoffice</Typography>
          <Typography variant="body2" color="text.secondary">Accès réservé à l'équipe. Authentification à deux facteurs obligatoire.</Typography>
          <TextField label="E-mail" type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <TextField label="Code à 6 chiffres (application d'authentification)" value={totp} onChange={(e) => setTotp(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 7, autoComplete: 'one-time-code' }} required />
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
        </CardContent>
      </Card>
    </Box>
  );
};
