import { createBrowserRouter } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { EPList } from './pages/EP/EPList';
import { EPDetail } from './pages/EP/EPDetail';
import { EPForm } from './pages/EP/EPForm';
import { EPFilePage } from './pages/EP/EPFilePage';
import { EPFileGeneratorPage } from './pages/EP/EPFileGeneratorPage';
import { EPList as EPListPage } from './pages/EP/EPList';
import { EPGpsMapPage } from './pages/EP/EPGpsMapPage';
import { EPGpsMapPage as EPGpsLocationPage } from './pages/EP/EPGpsMapPage';
import { InvalidEpsPage } from './pages/EP/InvalidEpsPage';
import { EpDataImportWizardPage } from './pages/Admin/EpDataImportWizardPage';
import { EPImportTablePage } from './pages/Admin/EPImportTablePage';
import { EpidCodeAdminPage } from './pages/Admin/EpidCodeAdminPage';
import { UsersPage } from './pages/Admin/UsersPage';
import { RolesPage } from './pages/Admin/RolesPage';
import { GrantAssistancePage } from './pages/Admin/GrantAssistancePage';
import { RateManagementPage } from './pages/Admin/RateManagementPage';
import { EpImportPage } from './pages/Admin/EpImportPage';
// ── Correction & Correction UI ─────────────────────────────
import { CorrectionPage } from './pages/CorrectionPage';
import { EpicadPage } from './pages/Epicad/EpicadPage';

import { ProjectSelect } from './pages/ProjectSelect';
import { Login } from './pages/Login';
import { ReportPage } from './pages/ReportPage';
import { ReportsIndex } from './pages/ReportsIndex';
import { ErrorDisplay } from './components/ErrorDisplay';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/projects',
    element: <ProjectSelect />,
  },
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/ep',
    children: [
      { path: '', element: <EPList /> },
      { path: 'invalid', element: <InvalidEpsPage /> },
      { path: 'eps', element: <EPForm /> },
      { path: 'eps/:id', element: <EPDetail /> },
      { path: 'ep-files', element: <EPFilePage /> },
      { path: 'ep-files/generator', element: <EPFileGeneratorPage /> },
      { path: 'gps', element: <EPGpsMapPage /> },
    ],
  },
  {
    path: '/corrections',
    element: <CorrectionPage />,
  },
  {
    path: '/epicad',
    element: <EpicadPage />,
  },
  {
    path: '/baseline',
    children: [
      { path: '', element: <BaselinePage /> },
      { path: 'eps', element: <BaselinePage /> },
      { path: 'family-members', element: <BaselinePage /> },
      { path: 'lands', element: <BaselinePage /> },
      { path: 'crops', element: <BaselinePage /> },
      { path: 'infrastructures', element: <BaselinePage /> },
      { path: 'trees', element: <BaselinePage /> },
      { path: 'tenants', element: <BaselinePage /> },
      { path: 'businesses', element: <BaselinePage /> },
      { path: 'workers', element: <BaselinePage /> },
      { path: 'gps', element: <BaselinePage /> },
    ],
  },
  {
    path: '/ec',
    element: <EcPage />,
  },
  {
    path: '/vouchers',
    children: [
      { path: '', element: <VoucherPage /> },
      { path: 'generator', element: <VoucherFileGeneratorPage /> },
      { path: ':id', element: <VoucherDetailPage /> },
    ],
  },
  {
    path: '/payments',
    element: <PaymentPage />,
  },
  {
    path: '/ep-gps',
    element: <EPGpsMapPage />,
  },
  {
    path: '/reports',
    children: [
      { path: '', element: <ReportsIndex /> },
      { path: 'all', element: <ReportPage /> },
    ],
  },
  {
    path: '/admin',
    children: [
      { path: 'users', element: <UsersPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'ep-id-codes', element: <EpidCodeAdminPage /> },
      { path: 'rates', element: <RateManagementPage /> },
      { path: 'grant-assistance', element: <GrantAssistancePage /> },
      { path: 'ep-import-wizard', element: <EpDataImportWizardPage /> },
      { path: 'ep-import-table', element: <EPImportTablePage /> },
    ],
  },
]);


