import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { i18nProvider } from './i18n';
import { LoginPage } from './Login';
import { Dashboard } from './Dashboard';
import { UserList, UserShow } from './Users';
import { AuditList } from './Audit';
import { ReleaseList } from './Releases';
import { PlanMatrix } from './PlanMatrix';
import { Profile } from './Profile';
import { AdminList, AdminShow, AdminCreate } from './Admins';
import { AppLayout } from './Layout';
import { lightTheme, darkTheme } from './theme';
import { RES } from './resources';
import { makeResource } from './content';
import { permits } from './api';

export const App = () => (
  <Admin authProvider={authProvider} dataProvider={dataProvider} i18nProvider={i18nProvider} loginPage={LoginPage} dashboard={Dashboard} layout={AppLayout}
    theme={lightTheme} darkTheme={darkTheme} defaultTheme="light" title="App'lika — Backoffice" requireAuth disableTelemetry>
    {(perms: string[]) => [
      permits(perms, 'users.read') ? <Resource key="users" name="users" options={{ label: 'Utilisateurs' }} list={UserList} show={UserShow} /> : null,
      permits(perms, 'referentiels.read') ? <Resource key="releases" name="releases" options={{ label: 'Versions publiées' }} list={ReleaseList} /> : null,
      permits(perms, 'audit.read') ? <Resource key="audit" name="audit" options={{ label: 'Journal d\'audit' }} list={AuditList} /> : null,
      permits(perms, 'admins.manage') ? <Resource key="admins" name="admins" options={{ label: 'Administrateurs' }} list={AdminList} show={AdminShow} create={AdminCreate} /> : null,
      ...RES.filter((r) => permits(perms, r.perm)).map((r) => <Resource key={r.name} name={r.name} options={{ label: r.label }} {...makeResource(r, perms)} />),
      <CustomRoutes key="routes">
        <Route path="/plan-matrix" element={<PlanMatrix />} />
        <Route path="/profile" element={<Profile />} />
      </CustomRoutes>,
    ]}
  </Admin>
);
