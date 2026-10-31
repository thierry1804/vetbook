import React from 'react';
import {
  FileTextOutlined, CalendarOutlined, FileOutlined, MedicineBoxOutlined, AlertOutlined, ClusterOutlined, AppstoreOutlined,
  ExperimentOutlined, BugOutlined, UnorderedListOutlined, CheckSquareOutlined, IdcardOutlined, TagOutlined, ControlOutlined,
  GiftOutlined, SyncOutlined, UnlockOutlined, CreditCardOutlined, FileDoneOutlined, SettingOutlined, FlagOutlined,
  ClockCircleOutlined, MailOutlined, TeamOutlined, CloudUploadOutlined, HistoryOutlined, SafetyCertificateOutlined,
  DashboardOutlined, TableOutlined, RobotOutlined,
} from '@ant-design/icons';

export const ICONS: Record<string, React.ComponentType<any>> = {
  tips: FileTextOutlined, events: CalendarOutlined, pages: FileOutlined, clinics: MedicineBoxOutlined, emergency_numbers: AlertOutlined,
  breeds: ClusterOutlined, species: AppstoreOutlined, vaccines: ExperimentOutlined, antiparasitics: BugOutlined, lists: UnorderedListOutlined,
  checkup: CheckSquareOutlined, registries: IdcardOutlined, plans: TagOutlined, features: ControlOutlined, coupons: GiftOutlined,
  subscriptions: SyncOutlined, overrides: UnlockOutlined, payments: CreditCardOutlined, invoices: FileDoneOutlined, settings: SettingOutlined,
  flags: FlagOutlined, jobs: ClockCircleOutlined, messages: MailOutlined, users: TeamOutlined, releases: CloudUploadOutlined, audit: HistoryOutlined,
  admins: SafetyCertificateOutlined, dashboard: DashboardOutlined, matrix: TableOutlined, ai: RobotOutlined, 'plan-matrix': TableOutlined,
};
