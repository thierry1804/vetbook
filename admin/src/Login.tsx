import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';

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
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, bgcolor: 'background.default' }}>
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#f2f7f4',
        bgcolor: '#173d32',
        backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '18px 18px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>A</Box>
          <Typography sx={{ fontWeight: 700 }}>App'lika</Typography>
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-.015em', maxWidth: 440, lineHeight: 1.2 }}>Le carnet de santé de tous les compagnons.</Typography>
          <Typography sx={{ mt: 2, opacity: .75, maxWidth: 420, fontSize: '0.9375rem' }}>Backoffice : contenus, référentiels, annuaire, formules et comptes.</Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: .55 }}>Accès réservé à l'équipe · connexion protégée par code à usage unique</Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}>
        <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 360, display: 'grid', gap: 2 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }}>A</Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>App'lika</Typography>
          </Box>
          <Box>
            <Typography variant="h5">Connexion</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .25 }}>Identifiants et code de ton application d'authentification.</Typography>
          </Box>
          {error ? <Alert severity="error" variant="outlined">{error}</Alert> : null}
          <TextField label="E-mail" type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required size="small" />
          <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required size="small" />
          <TextField label="Code à 6 chiffres" value={totp} onChange={(e) => setTotp(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 7, autoComplete: 'one-time-code' }} required size="small" />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
        </Box>
      </Box>
    </Box>
  );
};
