// ═══════════════════════════════════════════════════════════════
// Route configuration — Phase 4B-10
// ═══════════════════════════════════════════════════════════════

import { createBrowserRouter } from 'react-router';
import { Navigate } from 'react-router';
import { App } from '../App';
import { Dashboard } from '../pages/Dashboard';
import { ReportPage } from '../pages/ReportPage';
import { ReportsIndex } from '../pages/ReportsIndex';
import { CorrectionPage } from '../pages/CorrectionPage';
import { CorrectionHistoryPage } from '../pages/CorrectionHistoryPage';
import { CorrectionHistoryListPage } from '../pages/CorrectionHistoryListPage';
import { Login } from '../pages/Login';
import { ProjectSelect } from '../pages/ProjectSelect';
import { EPList } from '../pages/EP/EPList';
import { EPForm } from '../pages/EP/EPForm';
import { EPDetail } from '../pages/EP/EPDetail';
import { InvalidEpsPage } from '../pages/EP/InvalidEpsPage';
import { EPGpsMapPage } from '../pages/EP/EPGpsMapPage';
import { EPFilePage } from '../pages/EP/EPFilePage';
import { EPFileGeneratorPage } from '../pages/EP/EPFileGeneratorPage';
import { ECFileGeneratorPage } from '../pages/EP/ECFileGeneratorPage';
import { EPCardPage } from '../pages/EP/EPCardPage';
import { EpicadPage } from '../pages/EP/EpicadPage';
import { EpicadDesignPage } from '../pages/EP/EpicadDesignPage';
import { BaselineTablePage } from '../pages/EP/BaselinePage';
import { EpidCodeAdminPage } from '../pages/Admin/EpidCodeAdminPage';
import { RateManagementPage } from '../pages/Admin/RateManagementPage';
import { UsersPage } from '../pages/Admin/UsersPage';
import { RolesPage } from '../pages/Admin/RolesPage';
import { GrantAssistancePage } from '../pages/Admin/GrantAssistancePage';
import { EpImportPage } from '../pages/Admin/EpImportPage';
import { EpDataImportWizardPage } from '../pages/Admin/EpDataImportWizardPage';
import { EcPage } from '../pages/EP/EcPage';
import { ECPrintPage } from '../pages/EP/ECPrintPage';
import { VoucherPage } from '../pages/EP/VoucherPage';
import { VoucherDetailPage } from '../pages/EP/VoucherDetailPage';
import { VoucherPrintPage } from '../pages/EP/VoucherPrintPage';
import { VoucherFileGeneratorPage } from '../pages/EP/VoucherFileGeneratorPage';
import { AdditionalPaymentPage } from '../pages/EP/AdditionalPaymentPage';
import { PaymentPage } from '../pages/PaymentPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // ── Dashboard ────────────────────────────────────────────
      { index: true, element: <Dashboard /> },

      // ── EP (Affected Person) — Phase 4B-10 ──────────────────
      { path: 'ep', element: <EPList /> },
      { path: 'ep/new', element: <EPForm /> },
      { path: 'ep/invalid', element: <InvalidEpsPage /> },
      { path: 'ep/:id', element: <EPDetail /> },
      { path: 'ep/:id/edit', element: <EPForm /> },
      { path: 'ep/:id/file', element: <EPFilePage /> },
      { path: 'ep/:id/card', element: <EPCardPage /> },
      { path: 'ep/:id/epicad', element: <EpicadPage /> },
      { path: 'ep/:id/ec', element: <EcPage /> },
      { path: 'ep/:id/ec/print', element: <ECPrintPage /> },
      { path: 'ep/:id/voucher', element: <VoucherPage /> },
      { path: 'ep/:id/voucher/additional-payment', element: <AdditionalPaymentPage /> },
      { path: 'ep/:id/voucher/:vid', element: <VoucherDetailPage /> },
      { path: 'ep/:id/voucher/:vid/print', element: <VoucherPrintPage /> },

      // ── MIS Module Placeholders (future phases) ─────────────
      { path: 'epicad', element: <EpicadPage /> },
      { path: 'epicad/design', element: <EpicadDesignPage /> },
      { path: 'baseline', element: <Navigate to="/baseline/eps" replace /> },
      { path: 'baseline/:table', element: <BaselineTablePage /> },
      { path: 'ep-files', element: <EPFileGeneratorPage /> },
      { path: 'ec', element: <ECFileGeneratorPage /> },
      { path: 'vouchers', element: <VoucherFileGeneratorPage /> },
      { path: 'payments', element: <PaymentPage /> },

      // ── Data Correction ──────────────────────────────────────
      { path: 'corrections', element: <CorrectionPage /> },
      { path: 'corrections/history', element: <CorrectionHistoryListPage /> },
      { path: 'corrections/:entityType/:entityId/history', element: <CorrectionHistoryPage /> },

      // ── Reports ──────────────────────────────────────────────
      { path: 'reports', element: <ReportsIndex /> },
      { path: 'reports/:slug', element: <ReportPage /> },

      // ── Map (EP GPS Location) ────────────────────────────────
      { path: 'ep-gps', element: <EPGpsMapPage /> },

      // ── Admin (placeholders for future phases) ───────────────
      { path: 'admin/users', element: <UsersPage /> },
      { path: 'admin/roles', element: <RolesPage /> },
      { path: 'admin/ep-id-codes', element: <EpidCodeAdminPage /> },
      { path: 'admin/rates', element: <RateManagementPage /> },
      { path: 'admin/grant-assistance', element: <GrantAssistancePage /> },
      { path: 'admin/ep-import', element: <EpImportPage /> },
      { path: 'admin/ep-import-wizard', element: <EpDataImportWizardPage /> },

      // ── Auth ─────────────────────────────────────────────────
      { path: 'login', element: <Login /> },
      { path: 'projects', element: <ProjectSelect /> },
    ],
  },
]);
