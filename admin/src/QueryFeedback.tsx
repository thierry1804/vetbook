import { Alert, Button, Skeleton } from 'antd';

export function QueryFeedback({ loading, error, retry }: { loading?: boolean; error?: unknown; retry: () => unknown }) {
  if (error) return <Alert role="alert" type="error" showIcon style={{ marginBottom: 16 }} message="Impossible de charger les données"
    description={error instanceof Error ? error.message : 'Une erreur est survenue.'}
    action={<Button onClick={() => retry()}>Réessayer</Button>} />;
  if (loading) return <div aria-label="Chargement des données" style={{ padding: 24 }}><Skeleton active /></div>;
  return null;
}
