import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import type { HubDef } from './nav';

const { Text } = Typography;

// Chrome partagé d'un hub : plusieurs listes liées (ex. les 7 référentiels) accessibles en onglets sous
// une seule entrée de menu, au lieu d'une entrée de menu par liste. Les URLs de chaque onglet ne changent
// pas (/breeds reste /breeds) — seule la barre d'onglets est ajoutée au-dessus.
export function Hub({ hub }: { hub: HubDef }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const active = hub.tabs.find((t) => loc.pathname === '/' + t.key || loc.pathname.startsWith('/' + t.key + '/'))?.key || hub.tabs[0].key;
  return (
    <div>
      <div style={{ padding: '20px 24px 0' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>{hub.subtitle}</Text>
      </div>
      <Tabs activeKey={active} onChange={(k) => navigate('/' + k)} items={hub.tabs.map((t) => ({ key: t.key, label: t.label }))}
        style={{ paddingInline: 24 }} />
      <Outlet />
    </div>
  );
}
