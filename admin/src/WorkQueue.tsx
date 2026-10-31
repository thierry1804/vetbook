import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { api } from './api';
import { QueryFeedback } from './QueryFeedback';

export function WorkQueue() {
  const { data, error, isLoading, isFetching, refetch } = useQuery({ queryKey: ['work-queue'], queryFn: async () => (await api('/work-queue')).json });
  return <section className="admin-panel" aria-label="À traiter">
    <Space wrap style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div><Typography.Title level={5} style={{ margin: 0 }}>À traiter</Typography.Title><Typography.Text type="secondary">Accès direct aux éléments qui demandent une intervention.</Typography.Text></div>
      <Button loading={isFetching} onClick={() => refetch()}>Actualiser les tâches</Button>
    </Space>
    <QueryFeedback loading={isLoading} error={error} retry={refetch} />
    {!error && data ? <>
      <div className="work-queue-grid">{data.items.map((item: any) => <Link key={item.key} to={item.to} className="work-queue-item">
        <span style={{ fontSize: 24, fontWeight: 650, color: item.count ? 'var(--ant-color-primary)' : 'var(--ant-color-text-secondary)' }}>{item.count}</span>
        <span>{item.label}</span><span aria-hidden="true">→</span>
      </Link>)}</div>
      {!data.items.length ? <Empty description="Aucune rubrique accessible avec tes droits." image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>Actualisé le {new Date(data.updatedAt).toLocaleString('fr-FR')}</Typography.Text>
    </> : null}
  </section>;
}
