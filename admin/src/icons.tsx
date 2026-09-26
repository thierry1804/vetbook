import React from 'react';
import ArticleIcon from '@mui/icons-material/Article';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EmergencyIcon from '@mui/icons-material/Emergency';
import PetsIcon from '@mui/icons-material/Pets';
import CategoryIcon from '@mui/icons-material/Category';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import MedicationLiquidIcon from '@mui/icons-material/MedicationLiquid';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import SellIcon from '@mui/icons-material/Sell';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsIcon from '@mui/icons-material/Settings';
import FlagIcon from '@mui/icons-material/Flag';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MailIcon from '@mui/icons-material/Mail';
import PeopleIcon from '@mui/icons-material/People';
import PublishIcon from '@mui/icons-material/Publish';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TuneIcon from '@mui/icons-material/Tune';

export const ICONS: Record<string, React.ComponentType<any>> = {
  tips: ArticleIcon, events: EventIcon, pages: DescriptionIcon, clinics: LocalHospitalIcon, emergency_numbers: EmergencyIcon,
  breeds: PetsIcon, species: CategoryIcon, vaccines: VaccinesIcon, antiparasitics: MedicationLiquidIcon, lists: ListAltIcon,
  checkup: FactCheckIcon, registries: AppRegistrationIcon, plans: SellIcon, features: ToggleOnIcon, coupons: LocalOfferIcon,
  subscriptions: AutorenewIcon, overrides: CardGiftcardIcon, payments: PaymentsIcon, invoices: ReceiptLongIcon, settings: SettingsIcon,
  flags: FlagIcon, jobs: ScheduleIcon, messages: MailIcon, users: PeopleIcon, releases: PublishIcon, audit: HistoryIcon,
  admins: AdminPanelSettingsIcon, dashboard: DashboardIcon, matrix: TuneIcon,
};
