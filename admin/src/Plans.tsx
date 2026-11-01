import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Input, Segmented, Select, Space, Tag, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, permits } from './api';
import { useAuth } from './auth';
import { PageHeader, LABELS } from './ui';
import { QueryFeedback } from './QueryFeedback';
import { useListReturn } from './interaction';
import { download, toCsv } from './csv';

const money = (value: unknown) => Number(value).toLocaleString('fr-FR');
const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const variants = (offer: any) => [offer.monthly, offer.annual, offer.oneTime, offer.other].filter(Boolean);
export function Plans() {
  const { permissions } = useAuth(); const navigate = useNavigate();
  const canWrite = permits(permissions, 'billing.plans_write');
  const [params, setParams] = useSearchParams(); useListReturn('/plans');
  const billing = params.get('billing') === 'annuel' ? 'annuel' : 'mensuel';
  const q = params.get('q') || ''; const archive = params.get('archive') || 'active';
  const set = (key: string, value: string) => setParams((previous) => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ['plan-catalog'], queryFn: async () => (await api('/plan-catalog')).json });
  const accepts = (plan: any) => archive === 'all' || (archive === 'archived' ? plan.archived : !plan.archived);
  const offers = (data?.offers || []).filter((offer: any) => variants(offer).some((plan) => accepts(plan) && normalize(`${plan.name} ${plan.code}`).includes(normalize(q))));
  const exportCsv = () => {
    const columns = ['code', 'name', 'period', 'price_mga', 'trial_days', 'country', 'visible', 'archived'];
    const rows = offers.flatMap((offer: any) => variants(offer).filter(accepts));
    download('formules.csv', toCsv([columns, ...rows.map((plan: any) => columns.map((column) => plan[column]))]));
  };
  return <div style={{ padding: 24 }}>
    <PageHeader title="Formules" subtitle="Une offre, ses variantes mensuelle et annuelle. Les fiches de chaque variante restent modifiables séparément."
      actions={<Space wrap><Button loading={isFetching} onClick={() => refetch()}>Actualiser</Button><Button disabled={!data || !!error} onClick={exportCsv}>Exporter CSV</Button>{canWrite ? <Button type="primary" onClick={() => navigate('/plans/create')}>Nouvelle formule</Button> : null}</Space>} />
    <Space wrap style={{ marginBottom: 20 }}>
      <Segmented aria-label="Période de facturation" value={billing} options={[{ value: 'mensuel', label: 'Mensuel' }, { value: 'annuel', label: 'Annuel' }]} onChange={(value) => set('billing', String(value))} />
      <Input.Search aria-label="Rechercher une formule" placeholder="Rechercher une offre" value={q} allowClear onChange={(event) => set('q', event.target.value)} style={{ width: 260 }} />
      <Select aria-label="Archivage des formules" value={archive} onChange={(value) => set('archive', value)} style={{ width: 200 }} options={[{ value: 'active', label: 'Non archivées' }, { value: 'archived', label: 'Archivées' }, { value: 'all', label: 'Toutes' }]} />
      {data ? <Typography.Text type="secondary">{offers.length} offre(s)</Typography.Text> : null}
    </Space>
    <QueryFeedback loading={isLoading} error={error} retry={refetch} />
    {!error && data ? offers.length ? <div className="plan-catalog">{offers.map((offer: any) => {
      const selected = billing === 'annuel' ? offer.annual : offer.monthly;
      const free = offer.monthly && Number(offer.monthly.price_mga) === 0 && !offer.annual;
      const plan = [selected, offer.oneTime, offer.other, free ? offer.monthly : null].find((candidate) => candidate && accepts(candidate));
      const available = variants(offer).filter(accepts);
      return <section className="admin-panel plan-offer" key={offer.code}>
        <div><Typography.Title level={5} style={{ margin: 0 }}>{offer.title}</Typography.Title><Typography.Text type="secondary">{LABELS[(plan || available[0]).audience] || (plan || available[0]).audience}</Typography.Text></div>
        {plan ? <>
          <div><span style={{ fontSize: 28, fontWeight: 650 }}>{Number(plan.price_mga) === 0 ? 'Gratuit' : `${money(plan.price_mga)} MGA`}</span>{Number(plan.price_mga) !== 0 ? <span> / {plan.period === 'annuel' ? 'an' : plan.period === 'mensuel' ? 'mois' : plan.period === 'unique' ? 'paiement unique' : plan.period}</span> : null}</div>
          {plan.period === 'annuel' && offer.discount ? <div><Typography.Text type="secondary">Au lieu de <s>{money(offer.discount.reference)} MGA/an</s></Typography.Text><div><Tag color="success">Économie : {money(offer.discount.savings)} MGA/an ({offer.discount.percent} %)</Tag></div></div> : null}
          <Space wrap>{plan.country ? <Tag>Pays : {plan.country}</Tag> : null}{plan.archived ? <Tag>Archivée</Tag> : null}{!plan.visible ? <Tag>Masquée dans l’application</Tag> : null}{plan.trial_days > 0 ? <Tag>{plan.trial_days} jours d’essai</Tag> : null}{free ? <Tag>Sans facturation</Tag> : null}</Space>
          <Link to={`/plans/${encodeURIComponent(plan.code)}${canWrite ? '' : '/show'}`}><Button type="primary">{canWrite ? 'Modifier cette variante' : 'Voir cette variante'}</Button></Link>
        </> : <Typography.Paragraph type="secondary">Aucune variante {billing === 'annuel' ? 'annuelle' : 'mensuelle'} correspondant au filtre d’archivage.</Typography.Paragraph>}
        <Space wrap>{available.filter((variant) => variant.code !== plan?.code).map((variant) => <Link key={variant.code} to={`/plans/${encodeURIComponent(variant.code)}${canWrite ? '' : '/show'}`}>{canWrite ? 'Modifier' : 'Voir'} {variant.period === 'annuel' ? 'la variante annuelle' : variant.period === 'mensuel' ? 'la variante mensuelle' : variant.name}</Link>)}</Space>
      </section>;
    })}</div> : <Empty description="Aucune offre ne correspond aux filtres."><Button onClick={() => setParams({})}>Effacer les filtres</Button></Empty> : null}
  </div>;
}
