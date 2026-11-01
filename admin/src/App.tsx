import React from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { createBrowserRouter, RouterProvider, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, notifyUnauthorized, useAuth } from './auth';
import { ThemeModeProvider, useThemeMode } from './themeMode';
import { themeConfig } from './theme';
import { LoginPage } from './Login';
import { Dashboard } from './Dashboard';
import { UserList, UserShow } from './Users';
import { AuditList } from './Audit';
import { ReleaseList } from './Releases';
import { Plans } from './Plans';
import { PlanMatrix } from './PlanMatrix';
import { AiSettings } from './AiSettings';
import { SettingsScreen } from './SettingsScreen';
import { Profile } from './Profile';
import { AdminList, AdminShow, AdminCreate } from './Admins';
import { AppLayout } from './Layout';
import { Hub } from './Hub';
import { HUBS } from './nav';
import { RES } from './resources';
import { makeResource } from './content';
import { permits } from './api';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 } },
  queryCache: new QueryCache({ onError: notifyUnauthorized }),
  mutationCache: new MutationCache({ onError: notifyUnauthorized }),
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  if (status === 'out') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ResourceRoutes() {
  const { permissions } = useAuth();
  const visibleRes = RES.filter((r) => permits(permissions, r.perm));
  const resourceEls = new Map(visibleRes.map((r) => [r.name, makeResource(r, permissions)] as const));
  // Les onglets d'un hub (Référentiels/Offres/Facturation) gardent leurs URLs plates (/breeds, /plans…) — seule
  // la route de LISTE part sous le chrome du hub (barre d'onglets) ; Créer/Modifier/Afficher restent hors hub.
  const hubTabKeys = new Set(HUBS.flatMap((h) => h.tabs.map((t) => t.key)));
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        {permits(permissions, 'users.read') ? <>
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserShow />} />
        </> : null}
        {permits(permissions, 'referentiels.read') ? <Route path="releases" element={<ReleaseList />} /> : null}
        {permits(permissions, 'audit.read') ? <Route path="audit" element={<AuditList />} /> : null}
        {permits(permissions, 'admins.manage') ? <>
          <Route path="admins" element={<AdminList />} />
          <Route path="admins/create" element={<AdminCreate />} />
          <Route path="admins/:id" element={<AdminShow />} />
        </> : null}
        {permits(permissions, 'system.read') ? <Route path="app-settings" element={<SettingsScreen />} /> : null}
        {permits(permissions, 'system.write') ? <Route path="ai-settings" element={<AiSettings />} /> : null}
        <Route path="profile" element={<Profile />} />

        {HUBS.map((h) => (
          <Route key={h.key} element={<Hub hub={h} />}>
            {h.tabs.map((t) => {
              if (t.key === 'plans') return permits(permissions, 'billing.read') ? <Route key={t.key} path={t.key} element={<Plans />} /> : null;
              if (t.key === 'plan-matrix') return <Route key={t.key} path={t.key} element={<PlanMatrix />} />;
              const r = resourceEls.get(t.key);
              return r ? <Route key={t.key} path={t.key} element={<r.List />} /> : null;
            })}
          </Route>
        ))}

        {visibleRes.filter((r) => !hubTabKeys.has(r.name)).map((r) => {
          const { List } = resourceEls.get(r.name)!;
          return <Route key={r.name} path={r.name} element={<List />} />;
        })}

        {visibleRes.map((r) => {
          const { Show, Edit, Create } = resourceEls.get(r.name)!;
          return (
            <React.Fragment key={r.name}>
              {Create ? <Route path={`${r.name}/create`} element={<Create />} /> : null}
              {Edit ? <Route path={`${r.name}/:id`} element={<Edit />} /> : null}
              {Show ? <Route path={`${r.name}/:id/show`} element={<Show />} /> : null}
            </React.Fragment>
          );
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Themed({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  return (
    <ConfigProvider theme={{ ...themeConfig(mode), cssVar: true, hashed: false }} locale={frFR}>
      {children}
    </ConfigProvider>
  );
}

const router = createBrowserRouter([{ path: '*', element: <ResourceRoutes /> }]);

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
      <Themed>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </Themed>
    </ThemeModeProvider>
  </QueryClientProvider>
);
