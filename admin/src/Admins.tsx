import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Avatar, Button, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useResourceList, useResourceOne } from './data';
import { CredentialsDialog, PageHeader, Pill, RowList, StatusChip } from './ui';

const { Text, Title } = Typography;
type Role = { code: string; label: string; permissions: string[] };
const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  useEffect(() => { api<Role[]>('/roles').then((r) => setRoles(r.json)).catch(() => undefined); }, []);
  return roles;
};
const roleLabel = (roles: Role[], code: string) => roles.find((r) => r.code === code)?.label || code;
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const AdminList = () => {
  const navigate = useNavigate();
  const roles = useRoles();
  const { data, isFetching } = useResourceList('admins', { page: 1, perPage: 500, sort: { field: 'created_at', order: 'ASC' } });
  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Administrateurs" actions={<Button type="primary" onClick={() => navigate('/admins/create')}>Nouvel administrateur</Button>} />
      <Table rowKey="id" loading={isFetching} dataSource={data?.data} pagination={false}
        onRow={(r: any) => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/admins/${r.id}`) })}
        columns={[
          { title: 'Administrateur', key: 'a', render: (r: any) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={30} style={{ background: 'var(--ant-color-fill-secondary)', color: 'var(--ant-color-text)', fontSize: 12.5, fontWeight: 700 }}>{initials(r.name || r.email)}</Avatar>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></div>
            </div>) },
          { title: 'Rôle', key: 'role', render: (r: any) => <Pill label={roleLabel(roles, r.role_code)} /> },
          { title: 'Statut', key: 'status', render: (r: any) => (r.locked_until && new Date(r.locked_until) > new Date() ? <StatusChip value="suspendu" /> : <StatusChip value={r.status} />) },
          { title: 'Dernière connexion', dataIndex: 'last_login_at', render: (v: string) => (v ? new Date(v).toLocaleString('fr-FR') : 'Jamais') },
          { title: 'Créé le', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—') },
        ]} />
    </div>
  );
};

export const AdminCreate = () => {
  const roles = useRoles(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState('support');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/admins', { method: 'POST', body: { email, name, role_code: role } }); setCreated(r.json); }
    catch (err: any) { message.error(err.message); } finally { setBusy(false); }
  };
  const perms = roles.find((r) => r.code === role)?.permissions || [];
  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <PageHeader title="Nouvel administrateur" subtitle="Un mot de passe provisoire et un code TOTP sont générés : à transmettre à la personne." />
      <form onSubmit={submit} style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 20, display: 'grid', gap: 16 }}>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nom complet</Text><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Adresse e-mail</Text><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Rôle</Text><Select style={{ width: '100%' }} value={role} onChange={setRole} options={roles.map((r) => ({ value: r.code, label: r.label }))} /></div>
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Droits du rôle</Text>
          <Space wrap size={[6, 6]}>{perms.slice(0, 40).map((p) => <Pill key={p} label={p === '*' ? 'Tous les droits' : p} />)}</Space>
        </div>
        <Space><Button type="primary" htmlType="submit" loading={busy}>Créer le compte</Button><Button onClick={() => navigate('/admins')}>Annuler</Button></Space>
      </form>
      <CredentialsDialog creds={created?.credentials || null} email={created?.email || ''} title="Compte créé" onClose={() => navigate(`/admins/${created.id}`)} />
    </div>
  );
};

export const AdminShow = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const roles = useRoles(); const qc = useQueryClient();
  const { data: a, refetch } = useResourceOne('admins', id);
  const [dlg, setDlg] = useState<null | 'edit' | 'reset' | 'revoke'>(null);
  const [reason, setReason] = useState(''); const [role, setRole] = useState(''); const [status, setStatus] = useState(''); const [name, setName] = useState('');
  const [creds, setCreds] = useState<any>(null);
  useEffect(() => { if (a) { setRole(a.role_code); setStatus(a.status); setName(a.name); } }, [a]);
  if (!a || !Array.isArray(a.sessions)) return null;
  const close = () => { setDlg(null); setReason(''); };
  const run = async (fn: () => Promise<any>, ok: string) => { try { const r = await fn(); message.success(ok); close(); refetch(); qc.invalidateQueries({ queryKey: ['list', 'admins'] }); return r; } catch (e: any) { message.error(e.message); } };
  const locked = a.locked_until && new Date(a.locked_until) > new Date();
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1180 }}>
      <Button onClick={() => navigate('/admins')} size="small" style={{ justifySelf: 'start' }}>← Administrateurs</Button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar size={44} style={{ fontWeight: 700, background: 'var(--ant-color-fill-secondary)', color: 'var(--ant-color-text)' }}>{initials(a.name || a.email)}</Avatar>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Title level={5} style={{ margin: 0, lineHeight: 1.2 }}>{a.name}</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>{a.email}</Text>
        </div>
        <Pill label={roleLabel(roles, a.role_code)} />
        <StatusChip value={a.status} />
        {locked ? <StatusChip value="suspendu" /> : null}
      </div>
      <Space wrap>
        <Button type="primary" size="small" onClick={() => setDlg('edit')}>Modifier rôle / statut</Button>
        <Button size="small" onClick={() => setDlg('reset')}>Réinitialiser mot de passe et 2FA</Button>
        <Button size="small" onClick={() => setDlg('revoke')}>Fermer ses sessions</Button>
        {locked ? <Button size="small" onClick={() => run(() => api(`/admins/${a.id}/unlock`, { method: 'POST', body: {} }), 'Compte déverrouillé')}>Déverrouiller</Button> : null}
      </Space>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }} className="user-show-grid">
        <RowList title="Sessions actives" count={a.sessions.length} empty="Aucune session ouverte."
          rows={a.sessions.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <Text style={{ fontSize: 13 }} ellipsis>{String(s.user_agent || '—').slice(0, 44)}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{s.ip}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>{new Date(s.created_at).toLocaleString('fr-FR')}</Text>
            </div>))} />
        <RowList title="Dernières actions" count={a.audit.length} empty="Aucune action enregistrée."
          rows={a.audit.map((x: any) => (
            <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontSize: 13 }} ellipsis>{x.action}</Text><Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>{new Date(x.created_at).toLocaleString('fr-FR')}</Text></div>))} />
      </div>

      <Modal open={dlg === 'edit'} onCancel={close} title={`Modifier ${a.name}`} footer={<><Button onClick={close}>Annuler</Button><Button type="primary" disabled={reason.trim().length < 5} onClick={() => run(() => api(`/admins/${a.id}`, { method: 'PUT', body: { name, role_code: role, status, reason } }), 'Compte mis à jour')}>Enregistrer</Button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><Text style={{ fontSize: 12 }} type="secondary">Nom</Text><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Text style={{ fontSize: 12 }} type="secondary">Rôle</Text><Select style={{ width: '100%' }} value={role} onChange={setRole} options={roles.map((r) => ({ value: r.code, label: r.label }))} /></div>
          <div><Text style={{ fontSize: 12 }} type="secondary">Statut</Text><Select style={{ width: '100%' }} value={status} onChange={setStatus} options={[{ value: 'actif', label: 'Actif' }, { value: 'desactive', label: 'Désactivé' }]} /></div>
          <Alert type="info" showIcon message="Changer le rôle ou désactiver le compte ferme ses sessions." />
          <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
        </div>
      </Modal>
      <Modal open={dlg === 'reset'} onCancel={close} title="Réinitialiser les identifiants" footer={<><Button onClick={close}>Annuler</Button><Button danger disabled={reason.trim().length < 5} onClick={async () => { const r = await run(() => api(`/admins/${a.id}/reset-credentials`, { method: 'POST', body: { reason } }), 'Identifiants réinitialisés'); if (r) setCreds(r.json.credentials); }}>Réinitialiser</Button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Alert type="warning" showIcon message="Un nouveau mot de passe provisoire et un nouveau secret TOTP seront générés ; l'ancien téléphone d'authentification ne fonctionnera plus." />
          <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
        </div>
      </Modal>
      <Modal open={dlg === 'revoke'} onCancel={close} title={`Fermer les sessions de ${a.name}`} footer={<><Button onClick={close}>Annuler</Button><Button type="primary" disabled={reason.trim().length < 5} onClick={() => run(() => api(`/admins/${a.id}/revoke-sessions`, { method: 'POST', body: { reason } }), 'Sessions fermées')}>Fermer les sessions</Button></>}>
        <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
      </Modal>
      <CredentialsDialog creds={creds} email={a.email} title="Nouveaux identifiants" onClose={() => setCreds(null)} />
    </div>
  );
};
