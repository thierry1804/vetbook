import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { api, permits } from './api';
import { useAuth } from './auth';
import { useResourceList, useResourceOne } from './data';
import { FactPanel, PageHeader, RowList, StatusChip, adminActionLabel, RelativeDate } from './ui';

const { Text, Title } = Typography;
const mb = (b: number) => `${(b / 1e6).toFixed(1)} Mo`;
const n0 = (n: number) => (n ? String(n) : '—');
const LOCALE_LABELS: Record<string, string> = { fr: 'Français', en: 'Anglais', mg: 'Malgache' };
const formatEmergencyContact = (c: any) => {
  if (!c || typeof c !== 'object' || !c.name) return '—';
  return [c.name, c.relation, c.phone, c.email].filter(Boolean).join(' · ');
};
const initialsOf = (s: string) => String(s || '?').split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const UserList = () => {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const canSuspend = permits(permissions, 'users.suspend');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Record<string, any>>({});
  const { data, isFetching } = useResourceList('users', { page, perPage: 25, sort: { field: 'created_at', order: 'DESC' }, filter });
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [bulk, setBulk] = useState<null | 'suspend' | 'reactivate'>(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const runBulk = async () => {
    if (!bulk) return;
    setBusy(true);
    try {
      for (const id of selected) await api(`/users/${id}/${bulk}`, { method: 'POST', body: { reason } });
      message.success(bulk === 'suspend' ? `${selected.length} compte(s) suspendu(s)` : `${selected.length} compte(s) réactivé(s)`);
      setSelected([]); setBulk(null); setReason('');
      qc.invalidateQueries({ queryKey: ['list', 'users'] });
    } catch (e: any) { message.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Utilisateurs" />
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search placeholder="E-mail, nom, téléphone, n° de puce ou de pedigree" allowClear style={{ width: 380 }} onSearch={(q) => { setFilter({ ...filter, q: q || undefined }); setPage(1); }} />
        <Select placeholder="Statut" allowClear style={{ width: 160 }} options={[{ value: 'actif', label: 'Actif' }, { value: 'suspendu', label: 'Suspendu' }]} value={filter.status} onChange={(v) => { setFilter({ ...filter, status: v }); setPage(1); }} />
        <Select placeholder="E-mail" allowClear style={{ width: 160 }} options={[{ value: 'true', label: 'Vérifié' }, { value: 'false', label: 'Non vérifié' }]} value={filter.verified} onChange={(v) => { setFilter({ ...filter, verified: v }); setPage(1); }} />
        <Select placeholder="Méthode" allowClear style={{ width: 160 }} options={[{ value: 'google', label: 'Google' }, { value: 'email', label: 'E-mail' }]} value={filter.method} onChange={(v) => { setFilter({ ...filter, method: v }); setPage(1); }} />
        {canSuspend && selected.length ? (
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>{selected.length} sélectionné(s) :</Text>
            <Button size="small" danger onClick={() => setBulk('suspend')}>Suspendre</Button>
            <Button size="small" onClick={() => setBulk('reactivate')}>Réactiver</Button>
          </Space>
        ) : null}
      </Space>
      <Table rowKey="id" loading={isFetching} dataSource={data?.data} pagination={{ current: page, pageSize: 25, total: data?.total, showSizeChanger: false, onChange: setPage }}
        rowSelection={canSuspend ? { selectedRowKeys: selected, onChange: setSelected } : undefined}
        onRow={(r: any) => ({ style: { cursor: 'pointer' }, onClick: () => navigate(`/users/${r.id}`) })}
        columns={[
          { title: 'Utilisateur', key: 'u', render: (r: any) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={30} style={{ background: 'var(--ant-color-fill-secondary)', color: 'var(--ant-color-text)', fontSize: 12.5, fontWeight: 700 }}>{initialsOf(r.name || r.email)}</Avatar>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name || '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></div>
            </div>) },
          { title: 'Statut', key: 'status', render: (r: any) => <StatusChip value={r.status} /> },
          { title: 'Google', dataIndex: 'google', render: (v: boolean) => (v ? <Tag color="success">Oui</Tag> : '—') },
          { title: 'Animaux', dataIndex: 'animals' },
          { title: 'Dernière activité', dataIndex: 'last_seen_at', render: (v: string) => <RelativeDate value={v} /> },
          { title: 'Inscription', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—') },
        ]} />
      <Modal open={!!bulk} onCancel={() => setBulk(null)} title={bulk === 'suspend' ? `Suspendre ${selected.length} compte(s)` : `Réactiver ${selected.length} compte(s)`}
        footer={<><Button onClick={() => setBulk(null)}>Annuler</Button><Button type="primary" danger={bulk === 'suspend'} loading={busy} disabled={reason.trim().length < 5} onClick={runBulk}>Confirmer</Button></>}>
        <Input.TextArea placeholder="Motif (min. 5 caractères, journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} autoFocus />
      </Modal>
    </div>
  );
};

// Boîte de dialogue « action + motif » : le motif est obligatoire et journalisé côté serveur.
function ReasonDialog({ open, title, onClose, onSubmit, children }: { open: boolean; title: string; onClose: () => void; onSubmit: (reason: string) => Promise<void>; children?: React.ReactNode }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onSubmit(reason.trim()); setReason(''); onClose(); } finally { setBusy(false); } };
  return (
    <Modal open={open} onCancel={onClose} title={title} footer={<><Button onClick={onClose}>Annuler</Button><Button type="primary" loading={busy} disabled={reason.trim().length < 5} onClick={go}>Confirmer</Button></>}>
      <div style={{ display: 'grid', gap: 12 }}>
        {children}
        <Input.TextArea placeholder="Motif (min. 5 caractères, journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} autoFocus />
      </div>
    </Modal>
  );
}

export const UserShow = () => {
  const { id } = useParams();
  const { data: u, refetch } = useResourceOne('users', id);
  const { permissions } = useAuth();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<null | 'suspend' | 'reactivate' | 'logout-everywhere' | 'mark-verified' | 'subscription' | 'payment'>(null);
  const [plan, setPlan] = useState('premium'); const [subStatus, setSubStatus] = useState('actif'); const [endsAt, setEndsAt] = useState('');
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState('mvola'); const [ref, setRef] = useState('');
  if (!u || !Array.isArray(u.pets)) return null;
  const done = (msg: string) => { message.success(msg); refetch(); qc.invalidateQueries({ queryKey: ['list', 'users'] }); };
  const act = (name: string, ok: string) => async (reason: string) => {
    try { await api(`/users/${u.id}/${name}`, { method: 'POST', body: { reason } }); done(ok); } catch (e: any) { message.error(e.message); throw e; }
  };
  const canSuspend = permits(permissions, 'users.suspend'); const canSupport = permits(permissions, 'users.support'); const canBill = permits(permissions, 'billing.payment');
  const S = u.subscription;

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1180 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar size={44} style={{ fontWeight: 700, background: 'var(--ant-color-fill-secondary)', color: 'var(--ant-color-text)' }}>{initialsOf(u.name || u.email)}</Avatar>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Title level={5} style={{ margin: 0, lineHeight: 1.2 }}>{u.name || u.email}</Title>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <StatusChip value={u.status} />
            {u.email_verified_at ? null : <StatusChip value="a_valider" />}
            {u.google ? <Text type="secondary" style={{ fontSize: 12 }}>Google</Text> : null}
          </div>
        </div>
        <Space wrap>
          {canSupport ? <Button size="small" onClick={() => setDlg('logout-everywhere')}>Déconnecter partout</Button> : null}
          {canSupport && !u.email_verified_at ? <Button size="small" onClick={() => setDlg('mark-verified')}>Marquer vérifié</Button> : null}
          {canBill ? <Button size="small" onClick={() => setDlg('subscription')}>Attribuer une formule</Button> : null}
          {canBill && S ? <Button size="small" onClick={() => setDlg('payment')}>Enregistrer un paiement</Button> : null}
          {/* Action dangereuse : séparée des actions neutres (pas seulement par la couleur). */}
          {canSuspend ? (u.status === 'suspendu'
            ? <Button size="small" onClick={() => setDlg('reactivate')}>Réactiver</Button>
            : <Button size="small" danger type="text" style={{ marginLeft: 12 }} onClick={() => setDlg('suspend')}>Suspendre</Button>) : null}
        </Space>
      </div>

      {u.status === 'suspendu' ? (
        <div style={{ border: '1px solid var(--ant-color-error)', borderRadius: 6, padding: '10px 16px', background: 'rgba(154,68,51,.06)' }}>
          <Text style={{ fontSize: 13 }}>Suspendu {u.suspended_at ? `le ${new Date(u.suspended_at).toLocaleString('fr-FR')}` : ''} — {u.suspension_reason}</Text>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '7fr 5fr' }} className="user-show-grid">
        <FactPanel title="Compte" rows={[
          ['E-mail', u.email], ['Téléphone', u.phone || '—'], ['Langue', LOCALE_LABELS[u.locale] || u.locale || '—'], ['Inscription', u.created_at && new Date(u.created_at).toLocaleString('fr-FR')],
          ["CGU acceptées", u.terms_version ? `v${u.terms_version}` : '—'], ["Contact d'urgence", formatEmergencyContact(u.emergency_contact)],
          ['Formule', S ? `${S.plan_code} (${S.status}${S.ends_at ? ' → ' + new Date(S.ends_at).toLocaleDateString('fr-FR') : ''})` : 'aucune'],
          ['Stockage photos', mb(u.storage_bytes)], ['Membres du foyer', n0(u.household_members)], ['Liens de partage', n0(u.share_links)], ['Appareils notifiés', n0(u.push_subscriptions)],
        ]} />
        <RowList title="Animaux" count={u.pets.length} empty="Aucun animal enregistré."
          rows={u.pets.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Text strong style={{ fontSize: 13 }} ellipsis>{p.name}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{p.species} · {p.race} · {p.sex}</Text>
            </div>))} />
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }} className="user-show-grid">
        <RowList title="Sessions actives" count={u.sessions.length} empty="Aucune session ouverte."
          rows={u.sessions.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <Text style={{ fontSize: 13 }} ellipsis>{String(s.user_agent || '—').slice(0, 44)}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{s.ip}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>{new Date(s.last_seen_at).toLocaleString('fr-FR')}</Text>
            </div>))} />
        <RowList title="Historique des actions admin" count={u.audit.length} empty="Aucune action enregistrée."
          rows={u.audit.map((a: any) => (
            <div key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><Text strong style={{ fontSize: 13 }} ellipsis>{adminActionLabel(a.action).label}</Text><Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>{new Date(a.created_at).toLocaleString('fr-FR')}</Text></div>
              <Text type="secondary" style={{ fontSize: 12 }}>{a.admin_email}{a.reason ? ` — ${a.reason}` : ''}</Text>
            </div>))} />
      </div>

      <ReasonDialog open={dlg === 'suspend'} title="Suspendre le compte" onClose={() => setDlg(null)} onSubmit={act('suspend', 'Compte suspendu')} />
      <ReasonDialog open={dlg === 'reactivate'} title="Réactiver le compte" onClose={() => setDlg(null)} onSubmit={act('reactivate', 'Compte réactivé')} />
      <ReasonDialog open={dlg === 'logout-everywhere'} title="Déconnecter toutes les sessions" onClose={() => setDlg(null)} onSubmit={act('logout-everywhere', 'Sessions invalidées')} />
      <ReasonDialog open={dlg === 'mark-verified'} title="Marquer l'e-mail comme vérifié" onClose={() => setDlg(null)} onSubmit={act('mark-verified', 'E-mail marqué vérifié')} />
      <ReasonDialog open={dlg === 'subscription'} title="Attribuer une formule" onClose={() => setDlg(null)}
        onSubmit={async (reason) => {
          try { await api(`/users/${u.id}/subscription`, { method: 'POST', body: { reason, plan_code: plan, status: subStatus, ends_at: endsAt || null } }); done('Formule attribuée'); } catch (e: any) { message.error(e.message); throw e; }
        }}>
        <div><Text style={{ fontSize: 12 }} type="secondary">Code de la formule (gratuit, premium, eleveur, cabinet…)</Text><Input value={plan} onChange={(e) => setPlan(e.target.value)} /></div>
        <div><Text style={{ fontSize: 12 }} type="secondary">Statut</Text><Select style={{ width: '100%' }} value={subStatus} onChange={setSubStatus} options={['essai', 'actif', 'en_retard', 'suspendu'].map((s) => ({ value: s, label: s }))} /></div>
        <div><Text style={{ fontSize: 12 }} type="secondary">Fin de validité</Text><Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
      </ReasonDialog>
      <ReasonDialog open={dlg === 'payment'} title="Enregistrer un paiement (reçu généré)" onClose={() => setDlg(null)}
        onSubmit={async (reason) => {
          try { const r = await api(`/subscriptions/${S.id}/payments`, { method: 'POST', body: { reason, amount_mga: Number(amount), method, reference: ref || null } }); done(`Paiement enregistré — facture ${r.json.invoice.number}`); } catch (e: any) { message.error(e.message); throw e; }
        }}>
        <div><Text style={{ fontSize: 12 }} type="secondary">Montant (MGA)</Text><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><Text style={{ fontSize: 12 }} type="secondary">Moyen</Text><Select style={{ width: '100%' }} value={method} onChange={setMethod} options={['mvola', 'orange_money', 'airtel_money', 'carte', 'especes'].map((s) => ({ value: s, label: s }))} /></div>
        <div><Text style={{ fontSize: 12 }} type="secondary">Référence de transaction</Text><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
      </ReasonDialog>
    </div>
  );
};
