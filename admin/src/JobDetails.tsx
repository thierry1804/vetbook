import { Alert, Button, Descriptions, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { StatusChip } from './ui';

export function JobDetails({ record }: { record: any }) {
  const details = record.details || {}; const delivery = details.delivery;
  const filter = new URLSearchParams({ filter: JSON.stringify({ job_run_id: String(record.id) }) });
  return <section className="admin-panel"><Typography.Title level={5} style={{ marginTop: 0 }}>Résultat de l’exécution</Typography.Title>
    <Space wrap style={{ marginBottom: 16 }}><StatusChip value={record.status} /><span>{record.job}</span></Space>
    {record.status === 'running' ? <Alert type="info" showIcon message="Exécution en cours ou résultat final non encore enregistré. Actualise la fiche avant toute nouvelle tentative." style={{ marginBottom: 16 }} /> : null}
    {details.error ? <Alert type="error" showIcon message="Erreur d’exécution" description={details.error} style={{ marginBottom: 16 }} /> : null}
    <Descriptions column={1} size="small" items={[
      { key: 'processed', label: 'Traitements comptabilisés', children: record.sent },
      { key: 'reminders', label: 'Rappels repérés', children: details.reminderCount ?? 'Non enregistré' },
      { key: 'trigger', label: 'Déclenchement', children: details.trigger === 'manual' ? 'Manuel' : details.trigger === 'cron' ? 'Planifié' : 'Non enregistré' },
      ...(details.reason ? [{ key: 'reason', label: 'Motif', children: details.reason }] : []),
    ]} />
    {delivery ? <>
      <Descriptions column={1} size="small" title="Envois par canal" items={[
        { key: 'email', label: 'E-mails acceptés par SMTP', children: delivery.email.sent },
        { key: 'simulated', label: 'E-mails simulés', children: delivery.email.simulated },
        { key: 'email-failed', label: 'Échecs e-mail', children: delivery.email.failed },
        { key: 'push', label: 'Push acceptés par le service', children: delivery.push.sent },
        { key: 'push-failed', label: 'Échecs push', children: delivery.push.failed },
        { key: 'expired', label: 'Abonnements push expirés', children: delivery.push.expired },
      ]} />
      {!delivery.pushConfigured ? <Alert type="warning" showIcon message="Push non configuré : aucun push n’a été tenté pour cette exécution." style={{ marginBlock: 12 }} /> : null}
      <Link to={`/messages?${filter}`}><Button>Voir les tentatives liées à cette exécution</Button></Link>
    </> : <Alert type="info" showIcon message="Ancienne exécution : le détail des tentatives par canal n’était pas enregistré." style={{ marginTop: 12 }} />}
    <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>Un traitement ne garantit pas un envoi. L’acceptation par SMTP ou par un service push ne confirme pas la réception ni la lecture par la personne.</Typography.Paragraph>
  </section>;
}
