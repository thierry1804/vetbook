import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';

export const LoginPage = () => {
  const login = useLogin(); const notify = useNotify();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login({ username, password, totp: totp.replace(/\s/g, '') }); }
    catch (err: any) { setError(err?.message || 'Connexion impossible'); notify(err?.message || 'Connexion impossible', { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.default' }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#fff', background: 'linear-gradient(150deg,#1f5c4b 0%,#123a2f 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><PetsIcon /><Typography variant="h6">App'lika</Typography></Box>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-.02em', maxWidth: 480 }}>Le carnet de santé de tous les compagnons.</Typography>
          <Typography sx={{ mt: 2, opacity: .8, maxWidth: 440 }}>Backoffice : contenus, référentiels, annuaire, formules et comptes.</Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: .6 }}>Accès réservé à l'équipe · connexion protégée par code à usage unique</Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}>
        <Box component="form" onSubmit={submit} sx={{ width: 380, maxWidth: '100%', display: 'grid', gap: 2 }}>
          <Typography variant="h5">Connexion</Typography>
          <Typography variant="body2" color="text.secondary">Identifiants et code de ton application d'authentification.</Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField label="E-mail" type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <TextField label="Code à 6 chiffres" value={totp} onChange={(e) => setTotp(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 7, autoComplete: 'one-time-code' }} required />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
        </Box>
      </Box>
    </Box>
  );
};
