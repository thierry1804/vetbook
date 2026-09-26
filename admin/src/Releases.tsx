import React, { useState } from 'react';
import { List, Datagrid, TextField, DateField, FunctionField, useNotify, useRefresh, usePermissions, TopToolbar, Button as RaButton } from 'react-admin';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField as MuiText, Typography } from '@mui/material';
import { api, permits } from './api';

const COLORS: Record<string, any> = { draft: 'warning', published: 'success', archived: 'default' };

const Actions = () => {
  const { permissions } = usePermissions(); const notify = useNotify(); const refresh = useRefresh();
  const [open, setOpen] = useState(false); const [note, setNote] = useState('');
  if (!permits(permissions, 'referentiels.write')) return null;
  const create = async () => {
    try { const r = await api('/releases', { method: 'POST', body: { note } }); notify(`Brouillon v${r.json.version} créé`); setOpen(false); setNote(''); refresh(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };
  return (
    <TopToolbar>
      <Button variant="contained" onClick={() => setOpen(true)}>Nouveau brouillon depuis l'état actuel</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Figer une nouvelle version</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>Capture les référentiels, contenus publiés et annuaire validé. Rien n'est visible des apps tant qu'un autre administrateur ne l'a pas publiée.</Typography>
          <MuiText label="Note de version" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Annuler</Button><Button variant="contained" onClick={create}>Créer le brouillon</Button></DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

const PublishButton = ({ r }: { r: any }) => {
  const { permissions } = usePermissions(); const notify = useNotify(); const refresh = useRefresh();
  if (r.status !== 'draft' || !permits(permissions, 'referentiels.publish')) return null;
  const go = async () => {
    if (!window.confirm(`Publier la version ${r.version} ? Toutes les apps la récupéreront.`)) return;
    try { await api(`/releases/${r.version}/publish`, { method: 'POST', body: {} }); notify(`Version ${r.version} publiée`); refresh(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };
  return <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); go(); }}>Publier</Button>;
};

export const ReleaseList = () => (
  <List actions={<Actions />} pagination={false} sort={{ field: 'version', order: 'DESC' }} exporter={false}>
    <Datagrid bulkActionButtons={false}>
      <TextField source="version" label="Version" />
      <FunctionField label="Statut" render={(r: any) => <Chip size="small" color={COLORS[r.status]} label={r.status} />} />
      <TextField source="note" label="Note" />
      <TextField source="created_by_email" label="Créée par" />
      <DateField source="created_at" label="Créée le" showTime />
      <TextField source="published_by_email" label="Publiée par" />
      <DateField source="published_at" label="Publiée le" showTime />
      <FunctionField label="" render={(r: any) => <PublishButton r={r} />} />
    </Datagrid>
  </List>
);
