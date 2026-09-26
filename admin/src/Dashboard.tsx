import React, { useEffect, useState } from 'react';
import { usePermissions, useGetIdentity } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Grid, LinearProgress, Skeleton, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PetsIcon from '@mui/icons-material/Pets';
import PaymentsIcon from '@mui/icons-material/Payments';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import StorageIcon from '@mui/icons-material/Storage';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { api, permits } from './api';
import { PageHeader, StatusChip } from './ui';

const pct = (x: number) => `${Math.round((x || 0) * 100)} %`;
const mb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`);

const Kpi = ({ icon, label, value, hint, tone = 'primary.main' }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; tone?: string }) => (
  <Card sx={{ height: '100%' }}><CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: tone, flex: 'none' }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{value}</Typography>
      {hint ? <Typography variant="caption" color="text.secondary">{hint}</Typography> : null}
    </Box>
  </CardContent></Card>
);

const Bars = ({ title, rows }: { title: string; rows: { label: string; n: number }[] }) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Card sx={{ height: '100%' }}><CardContent>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{title}</Typography>
      {rows.length ? rows.map((r) => (
        <Box key={r.label} sx={{ mb: 1.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">{r.label}</Typography><Typography variant="body2" fontWeight={600}>{r.n}</Typography></Box>
          <LinearProgress variant="determinate" value={(r.n / max) * 100} sx={{ height: 6, borderRadius: 3 }} />
        </Box>)) : <Typography variant="body2" color="text.secondary">Pas encore de données.</Typography>}
    </CardContent></Card>
  );
};

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
    <Box sx={{ p: 2 }}>
      <PageHeader title={first ? `Bonjour ${first}` : 'Tableau de bord'} subtitle="Vue d'ensemble d'App'lika"
        actions={<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions.map((a) => <Button key={a[2]} variant="outlined" size="small" onClick={() => nav(a[2])}>{a[1]}</Button>)}</Box>} />
      {err ? <Alert severity="warning">{err}</Alert> : null}
      {!d && !err ? <Grid container spacing={2}>{[0, 1, 2, 3].map((i) => <Grid item xs={12} sm={6} md={3} key={i}><Skeleton variant="rounded" height={96} /></Grid>)}</Grid> : null}
      {d ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<PeopleIcon />} label="Comptes" value={d.users} hint={`+${d.signups7} sur 7 j · +${d.signups30} sur 30 j`} /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<TrendingUpIcon />} label="Actifs 7 j / 30 j" value={`${d.active7} / ${d.active30}`} tone="#2f7d9d" /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<PetsIcon />} label="Avec un animal" value={d.with_pet} hint={d.users ? pct(d.with_pet / d.users) + ' des comptes' : ''} tone="#8a5fbf" /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<PaymentsIcon />} label="MRR estimé" value={`${Number(d.mrr_mga).toLocaleString('fr-FR')} Ar`} tone="#c27a1a" /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<MarkEmailReadIcon />} label="E-mails vérifiés" value={pct(d.verified_ratio)} hint={`Google : ${pct(d.google_ratio)}`} tone="#3d8b5f" /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi icon={<StorageIcon />} label="Stockage photos" value={mb(d.storage_bytes)} tone="#5b6b78" /></Grid>
          <Grid item xs={12} md={6}><Kpi icon={<ScheduleIcon />} label="Dernier envoi de rappels"
            value={d.last_reminder_job ? <StatusChip value={d.last_reminder_job.status === 'ok' ? 'actif' : d.last_reminder_job.status} /> : '—'}
            hint={d.last_reminder_job ? `${d.last_reminder_job.sent} envoyés · ${d.last_reminder_job.failed} échecs · ${new Date(d.last_reminder_job.started_at).toLocaleString('fr-FR')}` : 'Aucune exécution enregistrée'} tone="#b5483b" /></Grid>
          <Grid item xs={12} md={6}><Bars title="Animaux par espèce" rows={d.pets_by_species.map((r: any) => ({ label: r.species, n: r.n }))} /></Grid>
          <Grid item xs={12} md={6}><Bars title="Races les plus suivies" rows={d.top_breeds.map((r: any) => ({ label: r.race, n: r.n }))} /></Grid>
        </Grid>) : null}
    </Box>
  );
};
