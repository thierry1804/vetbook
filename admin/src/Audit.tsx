import React from 'react';
import { List, Datagrid, TextField, DateField, SearchInput, useRecordContext } from 'react-admin';
import { Box } from '@mui/material';

const Detail = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Box component="pre" sx={{ m: 0, p: 1, fontSize: 12, whiteSpace: 'pre-wrap', bgcolor: 'action.hover' }}>
      {JSON.stringify({ motif: r.reason, avant: r.before, apres: r.after, ip: r.ip }, null, 2)}
    </Box>
  );
};

export const AuditList = () => (
  <List filters={[<SearchInput key="q" source="q" alwaysOn placeholder="Action, admin, cible" />]} perPage={50} sort={{ field: 'id', order: 'DESC' }} exporter={false}>
    <Datagrid expand={<Detail />} bulkActionButtons={false} rowClick="expand">
      <DateField locales="fr-FR" source="created_at" label="Date" showTime />
      <TextField source="admin_email" label="Administrateur" />
      <TextField source="action" label="Action" />
      <TextField source="target_type" label="Cible" />
      <TextField source="target_id" label="Id" />
      <TextField source="reason" label="Motif" />
    </Datagrid>
  </List>
);
