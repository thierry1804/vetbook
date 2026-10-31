import React, { useState } from 'react';
import { Alert, Button, Input, Typography, message } from 'antd';
import { useAuth } from './auth';

const { Text, Title } = Typography;

export const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(username, password, totp.replace(/\s/g, '')); }
    catch (err: any) { setError(err?.message || 'Connexion impossible'); message.error(err?.message || 'Connexion impossible'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--ant-color-bg-layout)' }} className="login-grid">
      <div className="login-hero" style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48, color: '#f2f7f4', background: '#173d32',
        backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '18px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>A</div>
          <Text style={{ color: '#f2f7f4', fontWeight: 700 }}>App'lika</Text>
        </div>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: '-.015em', maxWidth: 440, lineHeight: 1.2, fontSize: 28 }}>Le carnet de santé de tous les compagnons.</div>
          <div style={{ marginTop: 16, opacity: .75, maxWidth: 420, fontSize: 15 }}>Backoffice : contenus, référentiels, annuaire, formules et comptes.</div>
        </div>
        <Text style={{ color: '#f2f7f4', opacity: .55, fontSize: 12 }}>Accès réservé à l'équipe · connexion protégée par code à usage unique</Text>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, display: 'grid', gap: 16 }}>
          <div className="login-mobile-brand" style={{ display: 'none', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--ant-color-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }}>A</div>
            <Text style={{ fontWeight: 700, fontSize: 15 }}>App'lika</Text>
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Connexion</Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>Identifiants et code de ton application d'authentification.</Text>
          </div>
          {error ? <Alert type="error" message={error} showIcon /> : null}
          <div>
            <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>E-mail</Text>
            <Input type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          </div>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mot de passe</Text>
            <Input.Password value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Code à 6 chiffres</Text>
            <Input value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" maxLength={7} autoComplete="one-time-code" required />
          </div>
          <Button type="primary" htmlType="submit" size="large" loading={busy}>Se connecter</Button>
        </form>
      </div>
    </div>
  );
};
