import React, { useState } from 'react';
import { Button, Input, Modal, Table, Typography, message } from 'antd';
import { api, permits } from './api';
import { useAuth } from './auth';
import { useResourceList } from './data';
import { PageHeader, StatusChip } from './ui';

const { Text } = Typography;

const NewDraftButton = () => {
  const { permissions } = useAuth();
  const { refetch } = useResourceList('releases', { page: 1, perPage: 500, sort: { field: 'version', order: 'DESC' } });
  const [open, setOpen] = useState(false); const [note, setNote] = useState('');
  if (!permits(permissions, 'referentiels.write')) return null;
  const create = async () => {
    try { const r = await api('/releases', { method: 'POST', body: { note } }); message.success(`Brouillon v${r.json.version} créé`); setOpen(false); setNote(''); refetch(); }
    catch (e: any) { message.error(e.message); }
  };
  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>Nouveau brouillon depuis l'état actuel</Button>
      <Modal open={open} onCancel={() => setOpen(false)} title="Figer une nouvelle version" footer={<><Button onClick={() => setOpen(false)}>Annuler</Button><Button type="primary" onClick={create}>Créer le brouillon</Button></>}>
        <Text style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>Capture les référentiels, contenus publiés et annuaire validé. Rien n'est visible des apps tant qu'un autre administrateur ne l'a pas publiée.</Text>
        <Input.TextArea placeholder="Note de version" value={note} onChange={(e) => setNote(e.target.value)} autoSize={{ minRows: 2 }} />
      </Modal>
    </>
  );
};

const PublishButton = ({ r, onDone }: { r: any; onDone: () => void }) => {
  const { permissions } = useAuth();
  if (r.status !== 'draft' || !permits(permissions, 'referentiels.publish')) return null;
  const go = async () => {
    Modal.confirm({
      title: `Publier la version ${r.version} ?`, content: 'Toutes les apps la récupéreront.',
      onOk: async () => { try { await api(`/releases/${r.version}/publish`, { method: 'POST', body: {} }); message.success(`Version ${r.version} publiée`); onDone(); } catch (e: any) { message.error(e.message); } },
    });
  };
  return <Button size="small" onClick={(e) => { e.stopPropagation(); go(); }}>Publier</Button>;
};

export const ReleaseList = () => {
  const { data, isFetching, refetch } = useResourceList('releases', { page: 1, perPage: 500, sort: { field: 'version', order: 'DESC' } });
  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Versions publiées" actions={<NewDraftButton />} />
      <Table rowKey="version" loading={isFetching} dataSource={data?.data} pagination={false}
        columns={[
          { title: 'Version', dataIndex: 'version' },
          { title: 'Statut', key: 'status', render: (r: any) => <StatusChip value={r.status} /> },
          { title: 'Note', dataIndex: 'note' },
          { title: 'Créée par', dataIndex: 'created_by_email' },
          { title: 'Créée le', dataIndex: 'created_at', render: (v: string) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
          { title: 'Publiée par', dataIndex: 'published_by_email' },
          { title: 'Publiée le', dataIndex: 'published_at', render: (v: string) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
          { title: '', key: 'actions', render: (r: any) => <PublishButton r={r} onDone={() => refetch()} /> },
        ]} />
    </div>
  );
};
