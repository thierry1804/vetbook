import { ManagedTable } from './ManagedTable';
import { QueryFeedback } from './QueryFeedback';
import { useListReturn, useUnsavedChanges } from './interaction';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Alert, Avatar, Button, Input, Modal, Select, Space, Typography, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useResourceList, useResourceOne } from './data';
import { CredentialsDialog, PageHeader, Pill, RowList, StatusChip, adminActionLabel, RelativeDate } from './ui';

const { Text, Title } = Typography;
type Role = { code: string; label: string; permissions: string[] };

// Traduction des codes de droit (module.action) en français, groupés par module — un humain choisit ici
// qui a accès à quoi, ça ne doit jamais s'afficher en codes bruts (voir ROLES dans api/_lib/admin-auth.js).
const PERM_MODULES: Record<string, string> = {
  dashboard: 'Tableau de bord', users: 'Utilisateurs', pets: 'Animaux', referentiels: 'Référentiels', notifications: 'Notifications',
  sharing: 'Partage', storage: 'Stockage', system: 'Système', audit: 'Audit', rgpd: 'RGPD', billing: 'Facturation',
  contents: 'Contenus', directory: 'Annuaire',
};
const PERM_LABELS: Record<string, string> = {
  'dashboard.read': 'Consulter',
  'users.read': 'Consulter les fiches', 'users.support': 'Actions de support', 'users.suspend': 'Suspendre un compte', 'users.aggregate': 'Statistiques agrégées',
  'pets.read': 'Consulter les fiches', 'pets.read_reason': 'Consulter avec motif journalisé', 'pets.read_anon': 'Consulter anonymisé', 'pets.aggregate': 'Statistiques agrégées',
  'referentiels.read': 'Consulter', 'referentiels.write': 'Modifier', 'referentiels.publish': 'Publier une version',
  'notifications.read': 'Consulter', 'notifications.templates': 'Modifier les modèles', 'notifications.resend': 'Renvoyer', 'notifications.campaigns': 'Créer des campagnes', 'notifications.stats': 'Statistiques',
  'sharing.read': 'Consulter les liens', 'sharing.revoke': 'Révoquer un lien', 'sharing.aggregate': 'Statistiques agrégées',
  'storage.*': 'Tous les droits', 'storage.moderate': 'Modérer les fichiers',
  'system.*': 'Tous les réglages',
  'audit.read': 'Consulter le journal',
  'rgpd.execute': 'Exécuter une demande', 'rgpd.instruct': 'Instruire une demande',
  'billing.read': 'Consulter', 'billing.integrations': 'Gérer les intégrations', 'billing.payment': 'Gérer les paiements', 'billing.extend': 'Prolonger un abonnement',
  'billing.plans_write': 'Modifier les formules', 'billing.refund': 'Rembourser', 'billing.export': 'Exporter', 'billing.aggregate': 'Statistiques agrégées',
  'contents.read': 'Consulter', 'contents.write': 'Modifier', 'contents.publish': 'Publier', 'contents.review': 'Relire (validation vétérinaire)',
  'directory.*': 'Tous les droits', 'directory.read': 'Consulter', 'directory.write': 'Modifier', 'directory.validate': 'Valider une fiche',
};
function groupPermissions(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const mod = p.split('.')[0];
    (groups[mod] ||= []).push(p);
  }
  return Object.keys(groups).sort().map((mod) => ({ module: PERM_MODULES[mod] || mod, perms: groups[mod] }));
}
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
  const { data, isFetching, error, refetch } = useResourceList('admins', { page: 1, perPage: 500, sort: { field: 'created_at', order: 'ASC' } });
  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Administrateurs" actions={<Button type="primary" onClick={() => navigate('/admins/create')}>Nouvel administrateur</Button>} />
      <QueryFeedback error={error} retry={refetch} />
      {!error && <ManagedTable tableKey="admins" scroll={{ x: 'max-content' }} rowKey="id" loading={isFetching} dataSource={data?.data} pagination={false}
        onRow={(r: any) => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/admins/${r.id}`) })}
        columns={[
          { title: 'Administrateur', key: 'a', render: (r: any) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={30} style={{ background: 'var(--ant-color-fill-secondary)', color: 'var(--ant-color-text)', fontSize: 12.5, fontWeight: 700 }}>{initials(r.name || r.email)}</Avatar>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></div>
            </div>) },
          { title: 'Rôle', key: 'role', render: (r: any) => <Pill label={roleLabel(roles, r.role_code)} /> },
          { title: 'Statut', key: 'status', render: (r: any) => (r.locked_until && new Date(r.locked_until) > new Date() ? <StatusChip value="suspendu" /> : <StatusChip value={r.status} />) },
          { title: '2FA', dataIndex: 'totp_enabled', render: (v: boolean) => (v ? <CheckOutlined style={{ color: 'var(--ant-color-success)', fontSize: 15 }} /> : <Text type="danger" style={{ fontSize: 12.5 }}>Non activée</Text>) },
          { title: 'Dernière connexion', dataIndex: 'last_login_at', render: (v: string) => (v ? <RelativeDate value={v} /> : 'Jamais') },
          { title: 'Créé le', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—') },
        ]} />}
    </div>
  );
};

export const AdminCreate = () => {
  const roles = useRoles(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState('support');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const guard = useUnsavedChanges(!created && (!!email || !!name || role !== 'support'));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/admins', { method: 'POST', body: { email, name, role_code: role } }); setCreated(r.json); }
    catch (err: any) { message.error(err.message); } finally { setBusy(false); }
  };
  const perms = roles.find((r) => r.code === role)?.permissions || [];
  return (
    <div style={{ padding: 24 }}>
      {guard.dialog}
      <PageHeader title="Nouvel administrateur" back={{ label: 'Administrateurs', to: '/admins' }}
        subtitle="Un mot de passe provisoire et un code TOTP sont générés : à transmettre à la personne." />
      <form onSubmit={submit} style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 20, display: 'grid', gap: 16 }}>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}><Text type="danger">* </Text>Nom complet</Text><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}><Text type="danger">* </Text>Adresse e-mail</Text><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Rôle</Text><Select style={{ width: '100%' }} value={role} onChange={setRole} options={roles.map((r) => ({ value: r.code, label: r.label }))} /></div>
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Droits du rôle</Text>
          {perms.includes('*') ? <Pill label="Tous les droits, tous modules" /> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {groupPermissions(perms).map((g) => (
                <div key={g.module}>
                  <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)' }}>{g.module}</span>
                  <div style={{ marginTop: 6 }}><Space wrap size={[6, 6]}>{g.perms.map((p) => <Pill key={p} label={PERM_LABELS[p] || p} />)}</Space></div>
                </div>
              ))}
            </div>
          )}
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
  const { data: a, refetch, isLoading, error } = useResourceOne('admins', id);
  const [dlg, setDlg] = useState<null | 'edit' | 'reset' | 'revoke'>(null);
  const [reason, setReason] = useState(''); const [role, setRole] = useState(''); const [status, setStatus] = useState(''); const [name, setName] = useState('');
  const [creds, setCreds] = useState<any>(null);
  useEffect(() => { if (a) { setRole(a.role_code); setStatus(a.status); setName(a.name); } }, [a]);
  if (!a || error) return <QueryFeedback loading={isLoading} error={error} retry={refetch} />;
  const close = () => { setDlg(null); setReason(''); };
  const run = async (fn: () => Promise<any>, ok: string) => { try { const r = await fn(); message.success(ok); close(); refetch(); qc.invalidateQueries({ queryKey: ['list', 'admins'] }); return r; } catch (e: any) { message.error(e.message); } };
  const locked = a.locked_until && new Date(a.locked_until) > new Date();
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
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
        {a.totp_enabled
          ? <Space size={4}><CheckOutlined style={{ color: 'var(--ant-color-success)', fontSize: 13 }} /><Text type="secondary" style={{ fontSize: 12.5 }}>2FA activée</Text></Space>
          : <Text type="danger" style={{ fontSize: 12.5 }}>2FA non activée</Text>}
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
            <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontSize: 13 }} ellipsis>{adminActionLabel(x.action).label}</Text><Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>{new Date(x.created_at).toLocaleString('fr-FR')}</Text></div>))} />
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
