import React, { useEffect, useState } from 'react';
import { Card, CardContent, Grid, Typography, Table, TableBody, TableCell, TableRow, Alert } from '@mui/material';
import { api } from './api';

const Kpi = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <Card variant="outlined"><CardContent>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h4">{value}</Typography>
    {hint ? <Typography variant="caption" color="text.secondary">{hint}</Typography> : null}
  </CardContent></Card>
);
const pct = (x: number) => `${Math.round((x || 0) * 100)} %`;
const mb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`);

export const Dashboard = () => {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard').then((r) => setD(r.json)).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert severity="warning" sx={{ m: 2 }}>{err}</Alert>;
  if (!d) return <Typography sx={{ m: 2 }}>Chargement…</Typography>;
  const j = d.last_reminder_job;
  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Comptes" value={d.users} hint={`+${d.signups7} sur 7 j · +${d.signups30} sur 30 j`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Actifs 7 j / 30 j" value={`${d.active7} / ${d.active30}`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Avec un animal" value={d.with_pet} hint={d.users ? pct(d.with_pet / d.users) : ''} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="MRR estimé" value={`${Number(d.mrr_mga).toLocaleString('fr-FR')} MGA`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="E-mails vérifiés" value={pct(d.verified_ratio)} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Connexion Google" value={pct(d.google_ratio)} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Stockage photos" value={mb(d.storage_bytes)} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Dernier rappel" value={j ? j.status : '—'} hint={j ? `${j.sent} envoyés · ${j.failed} échecs` : 'aucune exécution'} /></Grid>
      <Grid item xs={12} md={6}><Card variant="outlined"><CardContent>
        <Typography variant="subtitle1">Animaux par espèce</Typography>
        <Table size="small"><TableBody>{d.pets_by_species.map((r: any) => <TableRow key={r.species}><TableCell>{r.species}</TableCell><TableCell align="right">{r.n}</TableCell></TableRow>)}</TableBody></Table>
      </CardContent></Card></Grid>
      <Grid item xs={12} md={6}><Card variant="outlined"><CardContent>
        <Typography variant="subtitle1">Races les plus suivies</Typography>
        <Table size="small"><TableBody>{d.top_breeds.map((r: any) => <TableRow key={r.race}><TableCell>{r.race}</TableCell><TableCell align="right">{r.n}</TableCell></TableRow>)}</TableBody></Table>
      </CardContent></Card></Grid>
    </Grid>
  );
};
