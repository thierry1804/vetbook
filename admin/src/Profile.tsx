import React, { useState } from 'react';
import { Alert, Button, Input, Progress, Typography, message } from 'antd';
import { api } from './api';
import { useAuth } from './auth';
import { PageHeader, Pill } from './ui';

const { Title, Text } = Typography;

const strength = (p: string) => {
  let s = 0;
  if (p.length >= 12) s++; if (p.length >= 16) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

export const Profile = () => {
  const { me } = useAuth();
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const s = strength(nw);
  const problem = nw && nw.length < 12 ? '12 caractères minimum' : again && again !== nw ? 'Les deux mots de passe diffèrent' : '';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setDone(false);
    try { await api('/auth/change-password', { method: 'POST', body: { current: cur, next: nw } }); setCur(''); setNw(''); setAgain(''); setDone(true); message.success('Mot de passe modifié'); }
    catch (err: any) { message.error(err.message); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <PageHeader title="Mon profil" subtitle="Ton compte d'administration" />
      <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 20, marginBottom: 16, display: 'grid', gap: 4 }}>
        <Title level={5} style={{ margin: 0 }}>{me?.name}</Title>
        <Text type="secondary">{me?.email}</Text>
        <div style={{ marginTop: 4 }}><Pill label={String(me?.role || '').replace(/_/g, ' ').replace(/^./, (c: string) => c.toUpperCase())} /></div>
      </div>
      <form onSubmit={submit} style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 20, display: 'grid', gap: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Changer le mot de passe</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Les autres sessions ouvertes avec ce compte seront fermées. Le code à 6 chiffres reste inchangé.</Text>
        {done ? <Alert type="success" showIcon message="Mot de passe modifié. Les autres sessions ont été déconnectées." /> : null}
        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mot de passe actuel</Text>
          <Input.Password value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        </div>
        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nouveau mot de passe</Text>
          <Input.Password value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" required status={problem && nw.length < 12 ? 'error' : undefined} />
          <Text type={nw && nw.length < 12 ? 'danger' : 'secondary'} style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{nw && nw.length < 12 ? problem : 'Astuce : une phrase de passe longue est plus sûre.'}</Text>
        </div>
        {nw ? <Progress percent={s * 20} showInfo={false} strokeColor={s >= 4 ? 'var(--ant-color-success)' : s >= 3 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)'} size="small" /> : null}
        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirmer le nouveau mot de passe</Text>
          <Input.Password value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required status={again && again !== nw ? 'error' : undefined} />
          {again && again !== nw ? <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{problem}</Text> : null}
        </div>
        <div><Button type="primary" htmlType="submit" loading={busy} disabled={!cur || nw.length < 12 || nw !== again}>Enregistrer</Button></div>
      </form>
    </div>
  );
};
