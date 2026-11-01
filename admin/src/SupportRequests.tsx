import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import { api } from './api';

type Reply = { id: number; body: string; created_at: string };
type Request = { id: string; email: string; subject: string; description: string; status: string; created_at: string; updated_at: string; account_linked: boolean; replies: Reply[] };
const states = [{ value: 'nouveau', label: 'Nouveau' }, { value: 'en_cours', label: 'En cours' }, { value: 'traite', label: 'Traité' }];

export function SupportRequests() {
  const cache = useQueryClient();
  const [replyTo, setReplyTo] = useState<Request | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['support-requests'], queryFn: async () => (await api<{ rows: Request[] }>('/support-requests')).json, refetchInterval: 30000 });
  async function change(id: string, status: string) {
    try { await api(`/support-requests/${id}`, { method: 'PATCH', body: { status } }); await cache.invalidateQueries({ queryKey: ['support-requests'] }); }
    catch (error) { message.error(error instanceof Error ? error.message : 'Modification impossible.'); }
  }
  async function sendReply() {
    if (!replyTo || !replyBody.trim()) return;
    setSending(true);
    try {
      await api(`/support-requests/${replyTo.id}/replies`, { method: 'POST', body: { body: replyBody.trim() } });
      await cache.invalidateQueries({ queryKey: ['support-requests'] });
      setReplyTo(null); setReplyBody(''); message.success('Réponse envoyée dans l’application.');
    } catch (error) { message.error(error instanceof Error ? error.message : 'Réponse impossible.'); }
    finally { setSending(false); }
  }
  return <div style={{ padding: 24 }}>
    <Typography.Title level={2} style={{ marginTop: 0 }}>Demandes de support</Typography.Title>
    <Typography.Paragraph>Les demandes et les réponses liées à un compte se mettent à jour en direct. Pour une demande sans compte, répondez par e-mail.</Typography.Paragraph>
    <Table<Request> rowKey="id" loading={isLoading} dataSource={data?.rows || []} scroll={{ x: 900 }} pagination={{ pageSize: 20 }} columns={[
      { title: 'Reçue le', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('fr-FR') },
      { title: 'Contact', dataIndex: 'email', render: (v: string) => <a href={`mailto:${v}`}>{v}</a> },
      { title: 'Sujet et échanges', render: (_: unknown, r: Request) => <Space direction="vertical"><strong>{r.subject}</strong><span style={{ whiteSpace: 'pre-wrap' }}>{r.description}</span>{r.replies.map(reply => <div key={reply.id} style={{ whiteSpace: 'pre-wrap', borderLeft: '3px solid #1677ff', paddingLeft: 10 }}><Typography.Text type="secondary">Réponse du {new Date(reply.created_at).toLocaleString('fr-FR')}</Typography.Text><br />{reply.body}</div>)}</Space> },
      { title: 'État', render: (_: unknown, r: Request) => <Select aria-label={`État de la demande ${r.id}`} value={r.status} options={states} style={{ width: 130 }} onChange={(v) => change(r.id, v)} /> },
      { title: '', render: (_: unknown, r: Request) => r.account_linked ? <Button onClick={() => { setReplyTo(r); setReplyBody(''); }}>Répondre dans l’application</Button> : <Button href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}>Répondre par e-mail</Button> },
    ]} />
    <Modal title={replyTo ? `Répondre à : ${replyTo.subject}` : 'Répondre'} open={!!replyTo} onCancel={() => { if (!sending) setReplyTo(null); }} onOk={sendReply} okText="Envoyer la réponse" okButtonProps={{ disabled: !replyBody.trim(), loading: sending }} cancelButtonProps={{ disabled: sending }}>
      <Typography.Paragraph>La réponse apparaîtra immédiatement dans le compte de l’utilisateur et dans ses notifications.</Typography.Paragraph>
      <Input.TextArea aria-label="Réponse au support" value={replyBody} onChange={event => setReplyBody(event.target.value)} maxLength={4000} showCount rows={6} />
    </Modal>
  </div>;
}
