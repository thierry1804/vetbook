import { useQuery } from '@tanstack/react-query';
import { Alert, Modal } from 'antd';
import { api } from './api';

export function SpeciesUsage({ code }: { code?: string }) {
  const { data, error } = useQuery({ queryKey: ['species-usage', code], enabled: !!code,
    queryFn: async () => (await api(`/r/species/${encodeURIComponent(code!)}/usage`)).json });
  if (error) return <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Impossible de vérifier les animaux liés. L’API vérifiera l’usage lors de l’archivage." />;
  if (!data) return null;
  return <Alert style={{ marginBottom: 16 }} type={data.animals && data.status === 'archive' ? 'warning' : 'info'} showIcon
    message={`${data.animals} animal(aux) utilisent cette espèce.`}
    description={data.animals && data.status === 'archive' ? 'Cette espèce est déjà archivée. Les carnets existants la conservent, mais elle peut ne plus être proposée lors des nouvelles saisies.' : data.animals ? 'Un archivage demandera une confirmation et ne changera pas les carnets existants.' : undefined} />;
}

// Check the complete selection before writing any row in a bulk archive action.
export async function confirmSpeciesArchive(codes: (string | number)[]) {
  const usages = await Promise.all(codes.map(async (code) => (await api(`/r/species/${encodeURIComponent(String(code))}/usage`)).json));
  const affected = usages.filter((usage) => usage.status !== 'archive' && usage.animals > 0);
  if (!affected.length) return 'unused' as const;
  return new Promise<'confirmed' | false>((resolve) => Modal.confirm({ title: 'Archiver des espèces utilisées ?',
    content: <><p>Des animaux utilisent encore ces espèces :</p><ul>{affected.map((usage) => <li key={usage.code}>{usage.code} : {usage.animals} animal(aux)</li>)}</ul><p>Les carnets existants sont conservés. Ces espèces pourront disparaître des choix proposés pour les nouvelles saisies.</p></>,
    okText: 'Archiver quand même', okButtonProps: { danger: true }, cancelText: 'Annuler',
    onOk: () => { resolve('confirmed'); }, onCancel: () => { resolve(false); },
  }));
}
