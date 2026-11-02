import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, Popconfirm, Table, Typography, message } from 'antd';
import { api } from './api';
import { useAuth } from './auth';
import { PageHeader } from './ui';

type Reply = { id: number; body: string; author?: 'user' | 'admin'; created_at: string };
type Request = {
  id: string; email: string; subject: string; description: string; status: string;
  created_at: string; updated_at: string; account_linked: boolean; matching_account: boolean; replies: Reply[];
};
type PetReport = { id: string; pet_name: string; reporter_email: string; reported_email: string; reason: string; status: string; created_at: string; messages: { body: string; author: string; created_at: string }[] };
const states = [{ value: 'nouveau', label: 'Nouveau' }, { value: 'en_cours', label: 'En cours' }, { value: 'traite', label: 'Close' }];
const labelOf = (status: string) => states.find((state) => state.value === status)?.label || status;
const when = (value: string) => new Date(value).toLocaleString('fr-FR');
const preview = (row: Request) => {
  const last = row.replies[row.replies.length - 1];
  const text = (last?.body || row.description).split('\n').map((line) => line.trim()).filter(Boolean)[0] || '';
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

export function SupportRequests() {
  const { me } = useAuth();
  const signature = me?.name?.trim() ? `— ${me.name.trim()}\nL'équipe App'lika` : `— L'équipe App'lika`;
  const cache = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const query = useQuery({ queryKey: ['support-requests'], queryFn: async () => (await api<{ rows: Request[] }>('/support-requests')).json, refetchInterval: 30000 });
  const reports = useQuery({ queryKey: ['pet-reports'], queryFn: async () => (await api<{ rows: PetReport[] }>('/pet-reports')).json, refetchInterval: 30000 });
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const report = reports.data?.rows.find((row) => row.id === selectedReport);
  async function reviewReport(row: PetReport) {
    try { await api(`/pet-reports/${row.id}`, { method: 'PATCH', body: { status: row.status === 'nouveau' ? 'traite' : 'nouveau' } }); await cache.invalidateQueries({ queryKey: ['pet-reports'] }); message.success('Signalement mis à jour.'); }
    catch (error) { message.error(error instanceof Error ? error.message : 'Modification impossible.'); }
  }
  const rows = query.data?.rows || [];
  const selected = rows.find((row) => row.id === selectedId) || null;
  const canReply = !!selected && (selected.account_linked || selected.matching_account);

  function open(row: Request) {
    if (row.id !== selectedId) setReplyBody('');
    setSelectedId(row.id);
  }
  async function change(id: string, status: string) {
    setChangingStatus(true);
    try { await api(`/support-requests/${id}`, { method: 'PATCH', body: { status } }); await cache.invalidateQueries({ queryKey: ['support-requests'] }); message.success(status === 'traite' ? 'Discussion close.' : 'Discussion rouverte.'); }
    catch (error) { message.error(error instanceof Error ? error.message : 'Modification impossible.'); }
    finally { setChangingStatus(false); }
  }
  async function sendReply() {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    try {
      await api(`/support-requests/${selected.id}/replies`, { method: 'POST', body: { body: replyBody.trim() } });
      await cache.invalidateQueries({ queryKey: ['support-requests'] });
      setReplyBody('');
      message.success('Réponse visible dans le compte de l’utilisateur.');
    } catch (error) { message.error(error instanceof Error ? error.message : 'Réponse impossible.'); }
    finally { setSending(false); }
  }

  return <div style={{ padding: 24 }}>
    <PageHeader title="Demandes de support" subtitle="Ouvrez une demande pour lire l’échange et répondre dans le compte." />
    <Typography.Title level={4}>Signalements de conversations</Typography.Title>
    <Table<PetReport> rowKey="id" loading={reports.isLoading} dataSource={reports.data?.rows || []} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 760 }} onRow={(row) => ({ onClick: () => setSelectedReport(row.id), style: { cursor: 'pointer' } })} columns={[
      { title: 'Reçu le', dataIndex: 'created_at', width: 170, render: when },
      { title: 'Animal', dataIndex: 'pet_name' },
      { title: 'Signalé par', dataIndex: 'reporter_email' },
      { title: 'Compte signalé', dataIndex: 'reported_email' },
      { title: 'État', dataIndex: 'status', width: 100, render: labelOf },
      { title: '', key: 'open', width: 100, render: (_: unknown, row: PetReport) => <Button onClick={(event) => { event.stopPropagation(); setSelectedReport(row.id); }}>Examiner</Button> },
    ]} />
    <Drawer title={report ? `Signalement · ${report.pet_name}` : 'Signalement'} open={!!report} onClose={() => setSelectedReport(null)} width="min(640px, 100vw)" extra={report ? <Button onClick={() => reviewReport(report)}>{report.status === 'nouveau' ? 'Marquer traité' : 'Rouvrir'}</Button> : null}>
      {report ? <div style={{ display: 'grid', gap: 12 }}><Typography.Text>{report.reporter_email} signale {report.reported_email}</Typography.Text><Message who="Motif" at={when(report.created_at)} body={report.reason} /><Typography.Title level={5}>Derniers messages</Typography.Title>{report.messages.map((m, index) => <Message key={index} who={m.author === 'reporter' ? 'Auteur du signalement' : 'Compte signalé'} at={when(m.created_at)} body={m.body} />)}</div> : null}
    </Drawer>
    <Typography.Title level={4}>Autres demandes</Typography.Title>
    <Table<Request>
      rowKey="id"
      loading={query.isLoading}
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      scroll={{ x: 760 }}
      onRow={(row) => ({ onClick: () => open(row), style: { cursor: 'pointer' } })}
      columns={[
        { title: 'Reçue le', dataIndex: 'created_at', width: 170, render: when },
        { title: 'Contact', dataIndex: 'email', width: 220 },
        { title: 'Sujet', key: 'subject', render: (_: unknown, row: Request) => <div style={{ minWidth: 220, maxWidth: 420 }}><div style={{ fontWeight: 600 }}>{row.subject}</div><Typography.Text type="secondary" ellipsis style={{ display: 'block' }}>{preview(row)}</Typography.Text></div> },
        { title: 'Échanges', key: 'count', width: 120, render: (_: unknown, row: Request) => row.replies.length ? `${row.replies.length} message${row.replies.length > 1 ? 's' : ''}` : 'En attente' },
        { title: 'État', dataIndex: 'status', width: 110, render: labelOf },
        { title: '', key: 'open', width: 110, render: (_: unknown, row: Request) => <Button onClick={(event) => { event.stopPropagation(); open(row); }}>Ouvrir</Button> },
      ]}
    />
    <Drawer
      title={selected ? selected.subject : 'Demande'}
      open={!!selected}
      onClose={() => { if (!sending) setSelectedId(null); }}
      width="min(640px, 100vw)"
      destroyOnClose
      extra={selected ? (selected.status === 'traite'
        ? <Button loading={changingStatus} disabled={sending} onClick={() => change(selected.id, 'en_cours')}>Rouvrir</Button>
        : <Popconfirm title="Clore cette discussion ?" description="L’utilisateur verra la discussion comme close. Un message de sa part la rouvre." okText="Clore" cancelText="Annuler" onConfirm={() => change(selected.id, 'traite')}><Button loading={changingStatus} disabled={sending}>Clore</Button></Popconfirm>) : null}
    >
      {selected ? <div style={{ display: 'grid', gap: 12 }}>
        <Typography.Text type="secondary">{selected.email} · reçue le {when(selected.created_at)}</Typography.Text>
        <Message who="Utilisateur" at={when(selected.created_at)} body={selected.description} />
        {selected.replies.map((reply) => <Message key={reply.id} who={reply.author === 'user' ? 'Utilisateur' : 'Support'} at={when(reply.created_at)} body={reply.body} />)}
        {selected.status === 'traite' ? <Typography.Text type="secondary">Discussion close. L’utilisateur peut la rouvrir en écrivant un message.</Typography.Text> : canReply ? <div>
          <Typography.Text strong>Répondre</Typography.Text>
          {!selected.account_linked ? <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>La demande sera rattachée au compte qui utilise cette adresse.</Typography.Paragraph> : null}
          <Input.TextArea aria-label="Réponse au support" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength={4000 - signature.length - 2} showCount rows={5} style={{ marginTop: 8 }} />
          <Typography.Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', margin: '8px 0 12px' }}>{signature}</Typography.Paragraph>
          <Button type="primary" loading={sending} disabled={!replyBody.trim()} onClick={sendReply}>Envoyer la réponse</Button>
        </div> : <Typography.Text type="secondary">Aucun compte ne correspond à cette adresse.</Typography.Text>}
      </div> : null}
    </Drawer>
  </div>;
}

function Message({ who, at, body }: { who: string; at: string; body: string }) {
  return <div className="admin-panel" style={{ padding: 12 }}>
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{who} · {at}</Typography.Text>
    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{body}</Typography.Paragraph>
  </div>;
}
