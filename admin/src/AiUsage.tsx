import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Progress, Space, Typography } from 'antd';
import { api } from './api';
import { QueryFeedback } from './QueryFeedback';

export function AiUsage() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ['ai-usage'], queryFn: async () => (await api('/ai-settings/usage')).json, refetchInterval: 10_000 });
  return <section className="admin-panel" aria-label="Consommation de l’assistant">
    <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}><Typography.Title level={5} style={{ margin: 0 }}>Budget local d’appels IA</Typography.Title><Button size="small" loading={isFetching} onClick={() => refetch()}>Actualiser la consommation</Button></Space>
    <QueryFeedback loading={isLoading} error={error} retry={refetch} />
    {data && !error ? <>
      <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>{data.minute.used} / {data.minute.limit} appels sur la dernière minute · {data.minute.remaining} disponibles maintenant</Typography.Paragraph>
      <Progress percent={Math.min(100, Math.round(data.minute.used / data.minute.limit * 100))} showInfo={false} status={data.minute.remaining ? 'normal' : 'exception'} />
      {!data.minute.remaining ? <Alert type="warning" showIcon message="Budget local atteint : les nouveaux appels sont temporairement refusés." description={data.minute.resetAt ? `Prochaine place disponible à partir de ${new Date(data.minute.resetAt).toLocaleTimeString('fr-FR')}.` : undefined} /> : null}
      <Typography.Paragraph>Dernières 24 h : {data.day.attempts} tentative(s), {data.day.success} réponse(s) réussie(s), {data.day.errors} échec(s), {data.day.pending} en cours ou sans résultat final enregistré.</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Appels de cette instance, y compris les tests administrateur. Ce budget n’indique pas le quota restant du compte OpenRouter et n’inclut pas les autres applications utilisant la même clé. Historique consultable sur {data.retentionDays} jours, sans contenu des conversations.</Typography.Paragraph>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Actualisé le {new Date(data.updatedAt).toLocaleString('fr-FR')}{data.observedSince ? ` · Premier appel conservé : ${new Date(data.observedSince).toLocaleString('fr-FR')}` : ' · Aucun appel enregistré par ce suivi.'}</Typography.Text>
    </> : null}
  </section>;
}
