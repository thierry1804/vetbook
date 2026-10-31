import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Collapse, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { api } from './api';
import { QueryFeedback } from './QueryFeedback';

const LABELS: Record<string, string> = { added: 'Ajout', modified: 'Modification', removed: 'Suppression' };
const print = (value: any) => value === null ? '—' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
export function ReleaseReview({ version, onClose, onPublished }: { version: number; onClose: () => void; onPublished: () => void }) {
  const [busy, setBusy] = useState(false);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['release-comparison', version], queryFn: async () => (await api(`/releases/${version}/comparison`)).json, staleTime: 0 });
  const sections = data?.sections || [];
  const total = sections.reduce((n: number, section: any) => n + section.changes.length, 0);
  const publish = async () => {
    setBusy(true);
    try {
      await api(`/releases/${version}/publish`, { method: 'POST', body: { baseVersion: data.baseVersion } });
      message.success(`Version ${version} publiée`); onPublished(); onClose();
    } catch (e: any) { message.error(e.message); refetch(); }
    finally { setBusy(false); }
  };
  return <Modal open width="min(1200px, calc(100vw - 32px))" title={`Examiner la version ${version}`} onCancel={() => { if (!busy) onClose(); }}
    footer={<Space wrap><Button disabled={busy} onClick={onClose}>Fermer</Button><Button loading={isLoading} disabled={busy} onClick={() => refetch()}>Recharger la comparaison</Button><Button type="primary" loading={busy} disabled={!data?.canPublish || !!error || isLoading} onClick={publish}>Publier cette version</Button></Space>}>
    <QueryFeedback loading={isLoading} error={error} retry={refetch} />
    {data && !error ? <>
      <Typography.Paragraph>{data.baseVersion ? `Comparaison avec la version publiée ${data.baseVersion}.` : 'Première publication : comparaison avec un catalogue vide.'} {total} changement(s).</Typography.Paragraph>
      {data.note ? <Typography.Paragraph><strong>Note :</strong> {data.note}</Typography.Paragraph> : null}
      {data.ownDraft ? <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Un autre administrateur doit publier ce brouillon (principe des quatre yeux)." /> : null}
      {data.canPublish ? <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="La publication rend ce contenu disponible aux applications. Examine les ajouts, modifications et suppressions ci-dessous avant de publier." /> : null}
      {!total ? <Alert type="info" message="Aucune différence avec la version publiée." /> : null}
      <Collapse items={sections.filter((section: any) => section.changes.length).map((section: any) => ({ key: section.key,
        label: <Space wrap><strong>{section.label}</strong><span>{section.added} ajout(s) · {section.modified} modification(s) · {section.removed} suppression(s)</span></Space>,
        children: <Table rowKey="id" size="small" scroll={{ x: 700 }} pagination={{ pageSize: 10, showSizeChanger: false }} dataSource={section.changes}
          columns={[
            { title: 'Élément', dataIndex: 'label', width: 180 },
            { title: 'Changement', dataIndex: 'kind', width: 130, render: (kind: string) => <Tag color={kind === 'removed' ? 'error' : kind === 'added' ? 'success' : 'warning'}>{LABELS[kind]}</Tag> },
            { title: 'Avant', dataIndex: 'before', render: (value: any) => <pre className="record-json">{print(value)}</pre> },
            { title: 'Après', dataIndex: 'after', render: (value: any) => <pre className="record-json">{print(value)}</pre> },
          ]} />,
      }))} />
    </> : null}
  </Modal>;
}
