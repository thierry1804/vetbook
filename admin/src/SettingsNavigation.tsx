import { createContext, useContext, useState } from 'react';
import { Badge, Button, Input, Space, Typography } from 'antd';

export const SETTING_SECTIONS = [
  { id: 'maintenance', title: 'Maintenance', keys: ['maintenance'], terms: 'application ouverte fermée message' },
  { id: 'formules', title: 'Formules', keys: ['subscription_timezone'], terms: 'application droits quotas cadenas abonnement' },
  { id: 'pays', title: 'Pays', keys: ['open_countries', 'default_country'], terms: 'pays ouverts défaut inscription' },
  { id: 'contact', title: 'Contact & abonnement', keys: ['contact'], terms: 'email e-mail téléphone whatsapp instructions souscription' },
  { id: 'limites', title: 'Limites', keys: ['max_household_members', 'max_share_days', 'max_upload_mb', 'storage_quota_mb'], terms: 'membres foyer lien vétérinaire durée photo stockage taille quota' },
  { id: 'publication', title: 'Publication', keys: ['four_eyes_publish', 'min_client_version'], terms: 'version minimale application quatre yeux' },
];
const Context = createContext('');
const matches = (section: typeof SETTING_SECTIONS[number], query: string) => `${section.title} ${section.terms}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query);
export function useSettingsSection(title: string) {
  const query = useContext(Context);
  const section = SETTING_SECTIONS.find((s) => s.title === title);
  return { id: section?.id, visible: !section || matches(section, query) };
}
export function SettingsNavigation({ changedKeys, children }: { changedKeys: string[]; children: React.ReactNode }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const visible = SETTING_SECTIONS.filter((section) => matches(section, query));
  return <Context.Provider value={query}>
    <Input.Search aria-label="Rechercher un réglage" placeholder="Rechercher un réglage : pays, photo, maintenance…" allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 20 }} />
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Sections des réglages"><Space direction="vertical" style={{ width: '100%' }}>
        {visible.map((section) => <Button key={section.id} block style={{ textAlign: 'left', height: 'auto', whiteSpace: 'normal' }}
          onClick={() => document.getElementById(`settings-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {section.title} {section.keys.some((key) => changedKeys.includes(key)) ? <Badge status="warning" text="Modifié" /> : null}
        </Button>)}
      </Space></nav>
      <div style={{ minWidth: 0 }}>{!visible.length ? <Typography.Paragraph>Aucun réglage ne correspond à cette recherche.</Typography.Paragraph> : null}{children}</div>
    </div>
  </Context.Provider>;
}
