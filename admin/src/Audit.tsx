import React, { useState } from 'react';
import { Input, Table, Tabs, Tag } from 'antd';
import { useResourceList } from './data';
import { PageHeader } from './ui';

function AdminActions() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Record<string, any>>({});
  const { data, isFetching } = useResourceList('audit', { page, perPage: 50, sort: { field: 'id', order: 'DESC' }, filter });
  return (
    <>
      <Input.Search placeholder="Action, admin, cible" allowClear style={{ width: 320, marginBottom: 12 }} onSearch={(q) => { setFilter({ q: q || undefined }); setPage(1); }} />
      <Table rowKey="id" loading={isFetching} dataSource={data?.data} pagination={{ current: page, pageSize: 50, total: data?.total, showSizeChanger: false, onChange: setPage }}
        expandable={{ expandedRowRender: (r: any) => <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--ant-color-fill-tertiary)', padding: 8 }}>{JSON.stringify({ motif: r.reason, avant: r.before, apres: r.after, ip: r.ip }, null, 2)}</pre> }}
        columns={[
          { title: 'Date', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
          { title: 'Administrateur', dataIndex: 'admin_email' },
          { title: 'Action', dataIndex: 'action' },
          { title: 'Cible', dataIndex: 'target_type' },
          { title: 'Id', dataIndex: 'target_id' },
          { title: 'Motif', dataIndex: 'reason' },
        ]} />
    </>
  );
}

// Navigation front (connectée ou non) + appels API publics marquants (connexion, inscription,
// lien de partage…) — table distincte de admin_audit_log (access_log, volume plus élevé).
function PublicAccess() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Record<string, any>>({});
  const { data, isFetching } = useResourceList('access-log', { page, perPage: 50, sort: { field: 'id', order: 'DESC' }, filter });
  return (
    <>
      <Input.Search placeholder="Action, chemin, IP" allowClear style={{ width: 320, marginBottom: 12 }} onSearch={(q) => { setFilter({ q: q || undefined }); setPage(1); }} />
      <Table rowKey="id" loading={isFetching} dataSource={data?.data} pagination={{ current: page, pageSize: 50, total: data?.total, showSizeChanger: false, onChange: setPage }}
        columns={[
          { title: 'Date', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
          { title: 'Type', dataIndex: 'kind', render: (v: string) => <Tag color={v === 'page' ? 'blue' : 'purple'}>{v === 'page' ? 'Page' : 'API'}</Tag> },
          { title: 'Action', dataIndex: 'action', render: (v: string) => (v?.endsWith('.echec') ? <Tag color="error">{v}</Tag> : v) },
          { title: 'Chemin', dataIndex: 'path' },
          { title: 'Utilisateur', dataIndex: 'user_id', render: (v: string) => v || <span style={{ color: 'var(--ant-color-text-tertiary)' }}>anonyme</span> },
          { title: 'IP', dataIndex: 'ip' },
        ]} />
    </>
  );
}

export const AuditList = () => (
  <div style={{ padding: 24 }}>
    <PageHeader title="Journal d'audit" />
    <Tabs defaultActiveKey="admin" items={[
      { key: 'admin', label: 'Actions admin', children: <AdminActions /> },
      { key: 'public', label: 'Accès publics', children: <PublicAccess /> },
    ]} />
  </div>
);
