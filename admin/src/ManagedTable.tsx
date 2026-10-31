import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Input, Modal, Popover, Select, Space, Table, Typography, message } from 'antd';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth';

type SavedView = { id: string; name: string; search: string; columns: string[] };
type Preferences = { columns?: string[]; views: SavedView[] };
const load = (key: string): Preferences => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return { columns: Array.isArray(value.columns) ? value.columns.filter((c: unknown) => typeof c === 'string') : undefined,
      views: Array.isArray(value.views) ? value.views.filter((v: any) => typeof v.id === 'string' && typeof v.name === 'string' && typeof v.search === 'string' && Array.isArray(v.columns)) : [] };
  } catch { return { views: [] }; }
};

// Account-specific preferences are stored on this browser. Views contain filters, sorting,
// pagination and visible columns; URL state remains shareable without local preferences.
export function ManagedTable({ tableKey, ...props }: React.ComponentProps<typeof Table<any>> & { tableKey: string }) {
  const { me } = useAuth();
  const location = useLocation(); const [, setParams] = useSearchParams();
  const storageKey = `applika-admin:table:${me?.id}:${tableKey}`;
  const [prefs, setPrefs] = useState<Preferences>(() => load(storageKey));
  const [open, setOpen] = useState(false); const [name, setName] = useState('');
  useEffect(() => { setPrefs(load(storageKey)); }, [storageKey]);
  const columns = useMemo(() => (props.columns || []).map((column: any, index) => ({ ...column, key: String(column.key ?? column.dataIndex ?? index) })), [props.columns]);
  const configurable = columns.filter((c) => c.title && typeof c.title === 'string');
  const keys = configurable.map((c) => c.key);
  const visible = prefs.columns === undefined ? keys : keys.filter((key) => prefs.columns!.includes(key));
  // Always retain an identity column, even when a previous schema removed a saved column.
  const shown = new Set(visible.length ? visible : keys.slice(0, 1));
  const persist = (value: Preferences) => {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); setPrefs(value); }
    catch { message.error('Impossible d’enregistrer les préférences dans ce navigateur.'); }
  };
  const save = () => {
    const trimmed = name.trim(); if (!trimmed) return;
    if (prefs.views.some((v) => v.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) { message.error('Une vue porte déjà ce nom.'); return; }
    persist({ ...prefs, views: [...prefs.views, { id: crypto.randomUUID(), name: trimmed, search: location.search, columns: [...shown] }] });
    setOpen(false); setName('');
  };
  const selectedView = prefs.views.find((view) => view.search === location.search && JSON.stringify([...view.columns].sort()) === JSON.stringify([...shown].sort()));
  return <>
    <Space wrap style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
      <Space wrap>
        <Select aria-label="Vues enregistrées" placeholder="Vues enregistrées" style={{ minWidth: 200 }} value={selectedView?.id}
          options={prefs.views.map((view) => ({ value: view.id, label: view.name }))}
          notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune vue enregistrée" />}
          onChange={(id) => { const view = prefs.views.find((v) => v.id === id); if (view) { persist({ ...prefs, columns: view.columns }); setParams(new URLSearchParams(view.search), { replace: true }); } }} />
        <Button onClick={() => setOpen(true)}>Enregistrer cette vue</Button>
        {selectedView ? <Button type="text" danger onClick={() => persist({ ...prefs, views: prefs.views.filter((v) => v.id !== selectedView.id) })}>Supprimer la vue</Button> : null}
      </Space>
      <Space wrap>
        {typeof props.pagination === 'object' && props.pagination.total !== undefined ? <Typography.Text type="secondary">{props.pagination.total.toLocaleString('fr-FR')} résultat(s)</Typography.Text> : null}
        <Popover trigger="click" placement="bottomRight" title="Colonnes affichées" content={<div style={{ display: 'grid', gap: 8 }}>
          {configurable.map((column) => <Checkbox key={column.key} checked={shown.has(column.key)} disabled={shown.has(column.key) && shown.size === 1}
            onChange={(e) => persist({ ...prefs, columns: e.target.checked ? [...shown, column.key] : [...shown].filter((key) => key !== column.key) })}>{column.title}</Checkbox>)}
          <Button size="small" onClick={() => persist({ ...prefs, columns: undefined })}>Toutes les colonnes</Button>
        </div>}><Button>Colonnes</Button></Popover>
      </Space>
    </Space>
    <Table {...props} columns={columns.filter((column) => !keys.includes(column.key) || shown.has(column.key))} />
    <Modal open={open} onCancel={() => setOpen(false)} title="Enregistrer cette vue" onOk={save} okText="Enregistrer la vue" okButtonProps={{ disabled: !name.trim() }}>
      <Typography.Paragraph type="secondary">Les filtres, le tri, la pagination et les colonnes seront conservés pour ton compte dans ce navigateur.</Typography.Paragraph>
      <Input aria-label="Nom de la vue" placeholder="Ex. : Cliniques à valider" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onPressEnter={save} />
      {prefs.views.length ? <div style={{ marginTop: 16 }}><Typography.Text strong>Gérer les vues</Typography.Text>{prefs.views.map((view) => <div key={view.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{view.name}</span><Button type="text" danger aria-label={`Supprimer la vue ${view.name}`} onClick={() => persist({ ...prefs, views: prefs.views.filter((v) => v.id !== view.id) })}>Supprimer</Button></div>)}</div> : null}
    </Modal>
  </>;
}
