import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, Space, Table, Typography, message } from 'antd';
import { api } from './api';

type Request = { id: number; email: string; subject: string; description: string; status: string; created_at: string; updated_at: string };
const states = [{ value: 'nouveau', label: 'Nouveau' }, { value: 'en_cours', label: 'En cours' }, { value: 'traite', label: 'Traité' }];

export function SupportRequests() {
  const cache = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['support-requests'], queryFn: async () => (await api<{ rows: Request[] }>('/support-requests')).json, refetchInterval: 30000 });
  async function change(id: number, status: string) {
    try { await api(`/support-requests/${id}`, { method: 'PATCH', body: { status } }); await cache.invalidateQueries({ queryKey: ['support-requests'] }); }
    catch (error) { message.error(error instanceof Error ? error.message : 'Modification impossible.'); }
  }
  return <div style={{ width: '100%' }}>
    <Typography.Title level={2}>Demandes de support</Typography.Title>
    <Typography.Paragraph>Messages envoyés depuis le centre d’aide. Répondez à l’adresse indiquée, puis mettez le dossier à jour.</Typography.Paragraph>
    <Table<Request> rowKey="id" loading={isLoading} dataSource={data?.rows || []} scroll={{ x: 900 }} pagination={{ pageSize: 20 }} columns={[
      { title: 'Reçue le', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('fr-FR') },
      { title: 'Contact', dataIndex: 'email', render: (v: string) => <a href={`mailto:${v}`}>{v}</a> },
      { title: 'Sujet et description', render: (_: unknown, r: Request) => <Space direction="vertical"><strong>{r.subject}</strong><span style={{ whiteSpace: 'pre-wrap' }}>{r.description}</span></Space> },
      { title: 'État', render: (_: unknown, r: Request) => <Select aria-label={`État de la demande ${r.id}`} value={r.status} options={states} style={{ width: 130 }} onChange={(v) => change(r.id, v)} /> },
      { title: '', render: (_: unknown, r: Request) => <Button href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}>Répondre</Button> },
    ]} />
  </div>;
}
