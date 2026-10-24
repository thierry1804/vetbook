import React, { useEffect, useState } from 'react';
import { usePermissions, useGetIdentity } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { api, permits } from './api';
import { BarList, MetricStrip, PageHeader, StatusChip } from './ui';

const pct = (x: number) => `${Math.round((x || 0) * 100)} %`;
const mb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`);
const TODAY = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export const Dashboard = () => {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  const { permissions } = usePermissions(); const { data: me } = useGetIdentity() as any; const nav = useNavigate();
  useEffect(() => { api('/dashboard').then((r) => setD(r.json)).catch((e) => setErr(e.message)); }, []);
  const first = String(me?.fullName || '').split(' ')[0];
  const actions = [
    ['users.read', 'Chercher un utilisateur', '/users'], ['contents.write', 'Écrire un conseil', '/tips/create'], ['referentiels.write', 'Préparer une version', '/releases'],
    ['billing.read', 'Formules et droits', '/plan-matrix'], ['directory.write', 'Ajouter une clinique', '/clinics/create'],
  ].filter((a) => permits(permissions, a[0]));

  return (
    <Box sx={{ p: 2.5, maxWidth: 1280 }}>
      <PageHeader title={first ? `Bonjour ${first}` : 'Tableau de bord'} subtitle={`App'lika · ${TODAY}`}
        actions={<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{actions.map((a) => <Button key={a[2]} variant="outlined" size="small" onClick={() => nav(a[2])}>{a[1]}</Button>)}</Stack>} />
      {err ? <Alert severity="warning">{err}</Alert> : null}
      {!d && !err ? <Stack spacing={2}><Skeleton variant="rounded" height={92} /><Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}><Skeleton variant="rounded" height={220} /><Skeleton variant="rounded" height={220} /></Box></Stack> : null}
      {d ? (
        <Stack spacing={2}>
          <MetricStrip items={[
            { label: 'Comptes', value: d.users, hint: `+${d.signups7} / 7 j · +${d.signups30} / 30 j` },
            { label: 'Actifs 7 j / 30 j', value: `${d.active7} / ${d.active30}` },
            { label: 'Avec un animal', value: d.with_pet, hint: d.users ? pct(d.with_pet / d.users) + ' des comptes' : undefined },
            { label: 'MRR estimé', value: `${Number(d.mrr_mga).toLocaleString('fr-FR')} Ar` },
            { label: 'E-mails vérifiés', value: pct(d.verified_ratio), hint: `Google : ${pct(d.google_ratio)}` },
            { label: 'Stockage photos', value: mb(d.storage_bytes) },
          ]} />

          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ minWidth: 160 }}>Dernier envoi de rappels</Typography>
            {d.last_reminder_job ? (
              <>
                <StatusChip value={d.last_reminder_job.status === 'ok' ? 'actif' : d.last_reminder_job.status} />
                <Typography variant="body2" color="text.secondary">
                  {d.last_reminder_job.sent} envoyé(s) · {d.last_reminder_job.failed} échec(s) · {new Date(d.last_reminder_job.started_at).toLocaleString('fr-FR')}
                </Typography>
              </>
            ) : <Typography variant="body2" color="text.secondary">Aucune exécution enregistrée.</Typography>}
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <BarList title="Animaux par espèce" rows={d.pets_by_species.map((r: any) => ({ label: r.species, n: r.n }))} />
            <BarList title="Races les plus suivies" rows={d.top_breeds.map((r: any) => ({ label: r.race, n: r.n }))} />
          </Box>
        </Stack>) : null}
    </Box>
  );
};
