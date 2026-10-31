import React, { useState } from 'react';
import { Button, Input, Space, Table, Tabs, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useResourceList } from './data';
import { PageHeader, adminActionLabel, RelativeDate } from './ui';

// Vraies icônes SVG (flag-icons) plutôt que l'emoji Unicode : Windows n'affiche pas les drapeaux
// emoji (choix délibéré de Microsoft, juste le code à deux lettres en clair) — le SVG rend pareil partout.
function FlagIcon({ code }: { code?: string | null }) {
  if (!code || code.length !== 2) return null;
  return <span className={`fi fi-${code.toLowerCase()}`} title={code} style={{ marginRight: 6, borderRadius: 2 }} />;
}

// Libellés humains pour les écrans/onglets du front, tels que vus dans l'app (voir index.html/app.js) —
// l'action brute stockée (ex. "page.detail.vaccins") reste la donnée ; ceci n'est que l'affichage admin.
const VIEW_LABELS: Record<string, string> = {
  home: 'Accueil', agenda: 'Agenda', directory: 'Annuaire vétérinaire', detail: 'Fiche animal',
  community: 'Communauté', profile: 'Compte & paramètres', favorites: 'Favoris', help: 'Aide', onboarding: 'Bienvenue',
};
const TAB_LABELS: Record<string, string> = {
  profil: 'Fiche', actes: 'Actes', nutrition: 'Nutrition', poids: 'Poids', suivi: 'Suivi', checkup: 'Check-up',
  vaccins: 'Vaccins', deworming: 'Déparasitage', medications: 'Traitements', hygiene: 'Hygiène',
  consultations: 'Consultations & budget', photos: 'Photos', activites: 'Activités', chaleurs: 'Chaleurs',
  reproduction: 'Reproduction', alertes: 'Rappels', historique: 'Frise',
  events: 'Événements', tips: 'Conseils', // panneaux de la communauté (view "community")
};
const API_LABELS: Record<string, string> = {
  'auth.register': 'Inscription', 'auth.login': 'Connexion', 'auth.google': 'Connexion Google',
  'auth.forgot_password': 'Mot de passe oublié', 'auth.reset_password': 'Réinitialisation mot de passe',
  'auth.verify_email': 'Vérification e-mail', 'share.view': 'Lien de partage', 'lookup.acym': 'Recherche LOMAD',
};
function actionLabel(kind: string, action: string): string {
  if (kind === 'page') {
    const parts = action.replace(/^page\./, '').split('.');
    const view = VIEW_LABELS[parts[0]] || parts[0];
    const sub = parts[1] ? (TAB_LABELS[parts[1]] || parts[1]) : null;
    return sub ? `${view} — ${sub}` : view;
  }
  const outcome = action.endsWith('.ok') ? '' : action.endsWith('.echec') ? ' (échec)' : '';
  const base = action.replace(/\.(ok|echec)$/, '');
  return (API_LABELS[base] || base) + outcome;
}

function Toolbar({ children, onRefresh, loading }: { children: React.ReactNode; onRefresh: () => void; loading: boolean }) {
  return (
    <Space style={{ marginBottom: 12 }}>
      {children}
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Recharger</Button>
    </Space>
  );
}

function AdminActions() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState<Record<string, any>>({});
  const { data, isFetching, refetch } = useResourceList('audit', { page, perPage: pageSize, sort: { field: 'id', order: 'DESC' }, filter });
  return (
    <>
      <Toolbar onRefresh={() => refetch()} loading={isFetching}>
        <Input.Search placeholder="Action, admin, cible" allowClear style={{ width: 320 }} onSearch={(q) => { setFilter({ q: q || undefined }); setPage(1); }} />
      </Toolbar>
      <Table rowKey="id" loading={isFetching} dataSource={data?.data}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, pageSizeOptions: [25, 50, 100], onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
        expandable={{ expandedRowRender: (r: any) => <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--ant-color-fill-tertiary)', padding: 8 }}>{JSON.stringify({ id: r.target_id, motif: r.reason, avant: r.before, apres: r.after, ip: r.ip }, null, 2)}</pre> }}
        columns={[
          { title: 'Date', dataIndex: 'created_at', render: (v: string) => <RelativeDate value={v} /> },
          { title: 'Administrateur', dataIndex: 'admin_email' },
          {
            title: 'Action', dataIndex: 'action',
            render: (v: string) => { const { label: l, failed } = adminActionLabel(v || ''); return failed ? <Tag color="error">{l}</Tag> : l; },
          },
          { title: 'Cible', dataIndex: 'target_type' },
          { title: 'Motif', dataIndex: 'reason', render: (v: string) => v || <span style={{ color: 'var(--ant-color-text-tertiary)' }}>—</span> },
        ]} />
    </>
  );
}

// Navigation front (connectée ou non) + appels API publics marquants (connexion, inscription,
// lien de partage…) — table distincte de admin_audit_log (access_log, volume plus élevé).
function PublicAccess() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState<Record<string, any>>({});
  const { data, isFetching, refetch } = useResourceList('access-log', { page, perPage: pageSize, sort: { field: 'id', order: 'DESC' }, filter });
  return (
    <>
      <Toolbar onRefresh={() => refetch()} loading={isFetching}>
        <Input.Search placeholder="Action, IP" allowClear style={{ width: 320 }} onSearch={(q) => { setFilter({ q: q || undefined }); setPage(1); }} />
      </Toolbar>
      <Table rowKey="id" loading={isFetching} dataSource={data?.data}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, pageSizeOptions: [25, 50, 100], onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
        columns={[
          { title: 'Date', dataIndex: 'created_at', render: (v: string) => <RelativeDate value={v} /> },
          { title: 'Type', dataIndex: 'kind', render: (v: string) => <Tag color={v === 'page' ? 'blue' : 'purple'}>{v === 'page' ? 'Page' : 'API'}</Tag> },
          {
            title: 'Action', dataIndex: 'action',
            render: (v: string, r: any) => {
              const label = actionLabel(r.kind, v || '');
              return v?.endsWith('.echec') ? <Tag color="error">{label}</Tag> : <span>{label}</span>;
            },
          },
          {
            title: 'Utilisateur', dataIndex: 'user_id',
            render: (v: string, r: any) => {
              if (!v) return <span style={{ color: 'var(--ant-color-text-tertiary)' }}>anonyme</span>;
              return r.user_name || r.user_email || <span style={{ color: 'var(--ant-color-text-tertiary)' }} title={v}>compte supprimé</span>;
            },
          },
          { title: 'IP', dataIndex: 'ip' },
          {
            title: 'Localisation', dataIndex: 'meta',
            render: (m: any) => {
              const geo = m?.geo;
              if (!geo || (!geo.city && !geo.country)) return <span style={{ color: 'var(--ant-color-text-tertiary)' }}>—</span>;
              const place = [geo.city, geo.region].filter(Boolean).join(', ');
              return <span><FlagIcon code={geo.country} />{place}</span>;
            },
          },
        ]} />
    </>
  );
}

export const AuditList = () => (
  <div style={{ padding: 24 }}>
    <PageHeader title="Journal d'audit" />
    <Tabs defaultActiveKey="admin" items={[
      { key: 'admin', label: 'Actions admin', children: <AdminActions /> },
      { key: 'public', label: 'Accès publics', children: <PublicAccess /> },
    ]} />
  </div>
);
