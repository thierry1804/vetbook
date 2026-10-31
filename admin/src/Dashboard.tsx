import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Skeleton, Space, Typography } from 'antd';
import { api, permits } from './api';
import { useAuth } from './auth';
import { BarList, MetricStrip, PageHeader, StatusChip, TrendChart } from './ui';

const { Text, Link } = Typography;
const pct = (x: number) => `${Math.round((x || 0) * 100)} %`;
const mb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`);
const TODAY = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export const Dashboard = () => {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  const { me, permissions } = useAuth(); const nav = useNavigate();
  useEffect(() => { api('/dashboard').then((r) => setD(r.json)).catch((e) => setErr(e.message)); }, []);
  const first = String(me?.name || '').split(' ')[0];
  // « Créer » (une action) et « aller à » (une navigation) n'ont pas le même poids : un bouton plein
  // pour les premières, un simple lien pour les secondes — avant, les cinq étaient des boutons identiques.
  const creates = [['contents.write', 'Écrire un conseil', '/tips/create'], ['directory.write', 'Ajouter une clinique', '/clinics/create']]
    .filter((a) => permits(permissions, a[0]));
  const gotos = [['users.read', 'Chercher un utilisateur', '/users'], ['referentiels.write', 'Préparer une version', '/releases'], ['billing.read', 'Formules et droits', '/plan-matrix']]
    .filter((a) => permits(permissions, a[0]));

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <PageHeader title={first ? `Bonjour ${first}` : 'Tableau de bord'} subtitle={`App'lika · ${TODAY}`}
        actions={<Space wrap>{creates.map((a) => <Button key={a[2]} onClick={() => nav(a[2])}>{a[1]}</Button>)}</Space>} />
      {gotos.length ? (
        <Space wrap style={{ marginBottom: 16, marginTop: -8 }}>
          {gotos.map((a, i) => (
            <React.Fragment key={a[2]}>
              {i > 0 ? <Text type="secondary">·</Text> : null}
              <Link onClick={() => nav(a[2])} style={{ fontSize: 13 }}>{a[1]}</Link>
            </React.Fragment>
          ))}
        </Space>
      ) : null}
      {err ? <Alert type="warning" message={err} showIcon /> : null}
      {!d && !err ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Skeleton.Button active block style={{ height: 92, width: '100%' }} />
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <Skeleton.Button active block style={{ height: 220, width: '100%' }} />
            <Skeleton.Button active block style={{ height: 220, width: '100%' }} />
          </div>
        </div>
      ) : null}
      {d ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <MetricStrip items={[
            { label: 'Comptes', value: d.users, hint: `+${d.signups7} / 7 j · +${d.signups30} / 30 j` },
            { label: 'Actifs 7 j', value: d.active7 },
            { label: 'Actifs 30 j', value: d.active30 },
            { label: 'Avec un animal', value: d.with_pet, hint: d.users ? pct(d.with_pet / d.users) + ' des comptes' : undefined },
            { label: 'MRR estimé', value: `${Number(d.mrr_mga).toLocaleString('fr-FR')} MGA` },
            { label: 'E-mails vérifiés', value: pct(d.verified_ratio), hint: `Google : ${pct(d.google_ratio)}` },
            { label: 'Stockage photos', value: mb(d.storage_bytes) },
          ]} />

          <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Text strong style={{ minWidth: 160, fontSize: 13 }}>Dernier envoi de rappels</Text>
            {d.last_reminder_job ? (
              <>
                <StatusChip value={d.last_reminder_job.status === 'ok' ? 'actif' : d.last_reminder_job.status} />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {d.last_reminder_job.sent} envoyé(s) · {d.last_reminder_job.failed} échec(s) · {new Date(d.last_reminder_job.started_at).toLocaleString('fr-FR')}
                </Text>
              </>
            ) : <Alert type="warning" showIcon style={{ flex: 1 }} message="Aucune exécution enregistrée — les rappels de rendez-vous/vaccins n'ont jamais été envoyés." />}
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.4fr 1fr' }} className="dashboard-bars">
            <TrendChart title="Inscriptions (30 derniers jours)" data={d.signups_by_day} />
            <BarList title="Animaux par espèce" rows={d.pets_by_species.map((r: any) => ({ label: r.species, n: r.n }))} />
          </div>
          <BarList title="Races les plus suivies" rows={d.top_breeds.map((r: any) => ({ label: r.race, n: r.n }))} />
        </div>) : null}
    </div>
  );
};
