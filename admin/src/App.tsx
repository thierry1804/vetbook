import React from 'react';
import { Admin, Resource, CustomRoutes, Layout, Menu, usePermissions } from 'react-admin';
import { Route } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import TuneIcon from '@mui/icons-material/Tune';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { i18nProvider } from './i18n';
import { LoginPage } from './Login';
import { Dashboard } from './Dashboard';
import { UserList, UserShow } from './Users';
import { AuditList } from './Audit';
import { ReleaseList } from './Releases';
import { PlanMatrix } from './PlanMatrix';
import { RES, makeResource } from './resources';
import { permits } from './api';

const AppMenu = () => {
  const { permissions } = usePermissions();
  const groups = Array.from(new Set(RES.map((r) => r.group)));
  return (
    <Menu>
      <Menu.DashboardItem />
      {permits(permissions, 'users.read') ? <Menu.ResourceItem name="users" /> : null}
      {permits(permissions, 'referentiels.read') ? <Menu.ResourceItem name="releases" /> : null}
      {permits(permissions, 'billing.read') ? <Menu.Item to="/plan-matrix" primaryText="Matrice des droits" leftIcon={<TuneIcon />} /> : null}
      {groups.map((g) => RES.filter((r) => r.group === g && permits(permissions, r.perm)).map((r) => <Menu.ResourceItem key={r.name} name={r.name} />))}
      {permits(permissions, 'audit.read') ? <Menu.ResourceItem name="audit" /> : null}
    </Menu>
  );
};
const AppLayout = (props: any) => <Layout {...props} menu={AppMenu} />;

export const App = () => (
  <Admin authProvider={authProvider} dataProvider={dataProvider} i18nProvider={i18nProvider} loginPage={LoginPage} dashboard={Dashboard} layout={AppLayout} title="App'lika — Backoffice" requireAuth disableTelemetry>
    {(perms: string[]) => [
      permits(perms, 'users.read') ? <Resource key="users" name="users" options={{ label: 'Utilisateurs' }} icon={PeopleIcon} list={UserList} show={UserShow} /> : null,
      permits(perms, 'referentiels.read') ? <Resource key="releases" name="releases" options={{ label: 'Versions publiées' }} icon={PublishIcon} list={ReleaseList} /> : null,
      permits(perms, 'audit.read') ? <Resource key="audit" name="audit" options={{ label: 'Journal d\'audit' }} icon={HistoryIcon} list={AuditList} /> : null,
      ...RES.filter((r) => permits(perms, r.perm)).map((r) => <Resource key={r.name} name={r.name} options={{ label: r.label }} {...makeResource(r, perms)} />),
      <CustomRoutes key="routes"><Route path="/plan-matrix" element={<PlanMatrix />} /></CustomRoutes>,
    ]}
  </Admin>
);
