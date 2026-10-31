import { useQuery } from '@tanstack/react-query';
import { Collapse, Empty, Typography } from 'antd';
import { api, permits } from './api';
import { useAuth } from './auth';
import { QueryFeedback } from './QueryFeedback';
import { adminActionLabel } from './ui';

export function RecordHistory({ resource, id }: { resource: string; id: string | number }) {
  const { permissions } = useAuth();
  const allowed = permits(permissions, 'audit.read');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['record-history', resource, id], enabled: allowed,
    queryFn: async () => (await api(`/record-history/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`)).json });
  if (!allowed) return null;
  return <section className="admin-panel"><Typography.Title level={5} style={{ marginTop: 0 }}>Historique des changements</Typography.Title>
    <QueryFeedback loading={isLoading} error={error} retry={refetch} />
    {data && !error ? data.length ? <>
      <Typography.Paragraph type="secondary">Les 50 dernières actions au maximum.</Typography.Paragraph>
      <Collapse items={data.map((entry: any) => ({ key: entry.id, label: <div><strong>{adminActionLabel(entry.action).label}</strong><div>{new Date(entry.created_at).toLocaleString('fr-FR')} · {entry.admin_email}</div></div>, children: <>
        {entry.reason ? <Typography.Paragraph>Motif : {entry.reason}</Typography.Paragraph> : null}
        <Typography.Text strong>Avant</Typography.Text><pre className="record-json">{JSON.stringify(entry.before, null, 2) || '—'}</pre>
        <Typography.Text strong>Après</Typography.Text><pre className="record-json">{JSON.stringify(entry.after, null, 2) || '—'}</pre>
      </> }))} />
    </> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun changement enregistré." /> : null}
  </section>;
}
