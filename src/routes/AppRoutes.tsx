import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

// Admin Pages
import {
  AdminPage,
  ReportsPage as AdminReportsPage,
  SalesPage as AdminSalesPage,
  StockPage as AdminStockPage,
  AdminViewReportsPage,
  DepartmentsPage as AdminDepartmentsPage,
  FinancePage,
  ProductionOverviewPage,
  SystemSettingsPage,
  UIPermissionsPage,
  UserManagementPage,
  WorkflowConfigPage,
  AdminGeneralStockPage,
  AdminBoutiqueStockPage,
  AdminBindingStockPage,
  AdminExpensesPage,
  AdminWithdrawalsPage,
} from "../pages/admin";

// Sales Officer Pages
import { ProformasPage, SalesPage, SalesStockPage, SalesCustomerPage, SalesReportsPage } from "../pages/sales";
import ProformaInvoicePage from "../pages/sales/ProformaInvoicePage";

// Finance Pages
import {
  Accountant1DocumentsPage,
  Accountant1InvoicesPage,
  Accountant1Page,
  Accountant1PaymentsPage,
  Accountant2Page,
  Accountant2ProcurementPage,
  Accountant2RecoveryPage,
  Accountant2TaxesPage,
  DAFJobApprovalPage,
  DAFPage,
  DAFReportsPage,
  FinanceControlPage,
  AccountantReportsPage,
} from "../pages/finance";

// Production Manager Pages
import { DepartmentsPage, JobAssignmentPage, ProductionManagerPage, ProductionManagerReportsPage } from "../pages/production-manager";

// Production Department Pages

// Stock Pages
import { SuppliersPage, StockReportsPage, BoutiqueStockPage, GeneralStockPage } from "../pages/stock";
import StockPage from "../pages/stock/StockPage";
import StockRequestsPage from "../pages/stock/StockRequestsPage";
import DAFGeneralStockRequestsPage from "../pages/stock/DAFGeneralStockRequestsPage";

// Supervisor Pages

// Worker Pages
import StatsPage from "../pages/worker/StatsPage";
import TaskManagementPage from "../pages/worker/TaskManagementPage";
import TimeLogsPage from "../pages/worker/TimeLogsPage";
import WorkerPage from "../pages/worker/WorkerPage";
import WorkerReportsPage from "../pages/worker/WorkerReportsPage";

// Reception Pages
import NotificationsPage from "../pages/NotificationsPage";
import ProfilePage from "../pages/ProfilePage";
import {
  DeliveriesPage,
  BoutiquePage,
  PaymentCollectionPage,
  ReceptionPage,
  BoutiqueStockRequestsPage,
  BindingStockRequestsPage,
  SheetsPage,
  ReceptionMaterialRequestPage,
  // TaskAssignmentPage,
} from "../pages/receptionalist";
import { ProductionPage, SupervisorPage, SupervisorReviewReportsPage, ReportsPage as SupervisorReportsPage, JobAssignmentPage as SupervisorJobAssignmentPage, DepartmentEmployeesPage, SupervisorMaterialRequestPage } from "../pages/supervisor";
import BindingStockPage from "../pages/supervisor/BindingStockPage";
import MachinesPage, { MachinesContent as AdminMachinesPage } from "../pages/supervisor/MachinesPage";
import SupervisorSamplesPage from "../pages/supervisor/SamplesPage";
import ExtraWorkersPage from "../pages/supervisor/ExtraWorkersPage";
import PMSamplesPage from "../pages/production-manager/PMSamplesPage";
import { MaterialRequestPage } from "../pages/worker";
import CustomerPage from "../pages/admin/customaPage";
import VisitorPage from "../pages/receptionalist/VisitorPage";
import MyReportsPage from "../pages/shared/MyReportsPage";
import UserGuidesPage from "../pages/UserGuidesPage";
import ReceptionReportsPage from "../pages/receptionalist/ReceptionReportsPage";
import RecentlyTradePage from "../pages/receptionalist/RecentlyTradePage";
import JobManagementPage from "../pages/sales/JobManagementPage";
import AdminJobManagementPage from "../pages/admin/JobManagementPage";
import HRPage from "../pages/HR/HRPage";
import EmployeesPage from "../pages/HR/EmployeesPage";
import HRReportsPage from "../pages/HR/HRReportsPage";
import HobePage from "../pages/Hobe/Dashboard";
import RequestsPage from "../pages/Hobe/Requests";
import ReportsPage from "../pages/Hobe/Reports";
import HobeTrade from "../pages/Hobe/Trade";
import ProdurementPage from "../pages/finance/ProdurementPage";
import Operations from "../pages/finance/Operations";
import MyLeavePage from "../pages/shared/MyLeavePage";
import MyOvertimePage from "../pages/shared/MyOvertimePage";
import OvertimeManagementPage from "../pages/admin/OvertimeManagementPage";
import SupervisorLeavePage from "../pages/supervisor/SupervisorLeavePage";
import HRLeaveManagementPage from "../pages/HR/LeaveManagementPage";
import { AdminLeaveManagementPage } from "../pages/admin";
import Abanyabiraka from "../pages/HR/abanyabiraka";
import PayrollPage from "../pages/HR/PayrollPage";
import GeneralStockPageOnPm from "../pages/production-manager/GeneralStockPage";
import PMBindingStockPage from "../pages/production-manager/BindingStockPage";
import JobPage from "../pages/Hobe/Job";
import CashierDashboard from "../pages/cashier/CashierDashboard";
import CashierPage from "../pages/cashier/CashierPage";
import CashierPaymentsPage from "../pages/cashier/CashierPaymentsPage";
import CashierBoutiquePaymentsPage from "../pages/cashier/CashierBoutiquePaymentsPage";
import CashierExpensesPage from "../pages/cashier/CashierExpensesPage";
import CashierCasualWorkersPage from "../pages/cashier/CashierCasualWorkersPage";
import CashierReportsPage from "../pages/cashier/CashierReportsPage";
import Withdraws from "../pages/cashier/Withdraws";
import ErrorBoundary from "../components/ErrorBoundary";
export default function AppRoutes() {
  return (
    <Routes>
      {/* Standalone login page (no navbar/footer) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]} pageId="users"><UserManagementPage /></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={["admin"]}><CustomerPage /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={["admin"]}><EmployeesPage /></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={["admin"]} pageId="jobs"><AdminJobManagementPage /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDepartmentsPage /></ProtectedRoute>} />
      <Route path="/admin/production" element={<ProtectedRoute allowedRoles={["admin"]}><ProductionOverviewPage /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><FinancePage /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/sales" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSalesPage /></ProtectedRoute>} />
      <Route path="/admin/stock" element={<ProtectedRoute allowedRoles={["admin"]}><AdminStockPage /></ProtectedRoute>} />
      <Route path="/admin/stock/general" element={<ProtectedRoute allowedRoles={["admin"]}><AdminGeneralStockPage /></ProtectedRoute>} />
      <Route path="/admin/stock/boutique" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBoutiqueStockPage /></ProtectedRoute>} />
      <Route path="/admin/stock/binding" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBindingStockPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReportsPage /></ProtectedRoute>} />
      <Route path="/admin/reports/view" element={<ProtectedRoute allowedRoles={["admin"]}><AdminViewReportsPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><SystemSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/workflow" element={<ProtectedRoute allowedRoles={["admin"]}><WorkflowConfigPage /></ProtectedRoute>} />
      <Route path="/admin/ui-permissions" element={<ProtectedRoute allowedRoles={["admin"]}><UIPermissionsPage /></ProtectedRoute>} />
      <Route path="/admin/leave" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLeaveManagementPage /></ProtectedRoute>} />
      <Route path="/admin/expenses" element={<ProtectedRoute allowedRoles={["admin"]}><AdminExpensesPage /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute allowedRoles={["admin"]}><AdminWithdrawalsPage /></ProtectedRoute>} />
      <Route path="/admin/machines" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMachinesPage isAdmin /></ProtectedRoute>} />
      <Route path="/admin/abanyabiraka" element={<ProtectedRoute allowedRoles={["admin"]}><Abanyabiraka /></ProtectedRoute>} />
      <Route path="/admin/extra-workers" element={<ProtectedRoute allowedRoles={["admin"]}><ExtraWorkersPage /></ProtectedRoute>} />
      <Route path="/admin/overtime" element={<ProtectedRoute allowedRoles={["admin"]}><OvertimeManagementPage /></ProtectedRoute>} />
      <Route path="/admin/payroll" element={<ProtectedRoute allowedRoles={["admin"]}><PayrollPage /></ProtectedRoute>} />
      <Route path="/admin/proformas" element={<ProtectedRoute allowedRoles={["admin"]}><ProformasPage /></ProtectedRoute>} />
      <Route path="/admin/job-approvals" element={<ProtectedRoute allowedRoles={["admin"]}><DAFJobApprovalPage /></ProtectedRoute>} />
      <Route path="/admin/deliveries" element={<ProtectedRoute allowedRoles={["admin"]}><DeliveriesPage /></ProtectedRoute>} />
      <Route path="/admin/procurement" element={<ProtectedRoute allowedRoles={["admin"]}><ProdurementPage /></ProtectedRoute>} />
      <Route path="/admin/recovery" element={<ProtectedRoute allowedRoles={["admin"]}><Accountant2RecoveryPage /></ProtectedRoute>} />
      <Route path="/admin/operations" element={<ProtectedRoute allowedRoles={["admin"]}><Operations /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><NotificationsPage userRole="admin" userName="Admin" /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={["admin"]}><ProfilePage /></ProtectedRoute>} />

      {/* Reception Routes */}
      <Route path="/reception" element={<ProtectedRoute allowedRoles={["receptionist"]}><ReceptionPage /></ProtectedRoute>} />
      <Route path="/reception/visitor" element={<ProtectedRoute allowedRoles={["receptionist"]} pageId="visitor"><VisitorPage /></ProtectedRoute>} />
      <Route path="/reception/deliveries" element={<ProtectedRoute allowedRoles={["receptionist"]} pageId="deliveries"><DeliveriesPage /></ProtectedRoute>} />
      <Route path="/reception/payments" element={<ProtectedRoute allowedRoles={["receptionist"]} pageId="payments"><PaymentCollectionPage /></ProtectedRoute>} />
      <Route path="/reception/boutique" element={<ProtectedRoute allowedRoles={["receptionist"]} pageId="boutique"><BoutiquePage /></ProtectedRoute>} />
      <Route path="/reception/leave" element={<ProtectedRoute allowedRoles={["receptionist"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/reception/overtime" element={<ProtectedRoute allowedRoles={["receptionist"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/reception/notifications" element={<ProtectedRoute allowedRoles={["receptionist"]}><NotificationsPage userRole="receptionist" userName="Receptionist" /></ProtectedRoute>} />
      <Route path="/reception/profile" element={<ProtectedRoute allowedRoles={["receptionist"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/reception/reports" element={<ProtectedRoute allowedRoles={["receptionist"]}><ReceptionReportsPage /></ProtectedRoute>} />
      <Route path="/reception/boutique/recently" element={<ProtectedRoute allowedRoles={["receptionist"]} pageId="boutique"><RecentlyTradePage /></ProtectedRoute>} />
      <Route path="/reception/reports/my" element={<ProtectedRoute allowedRoles={["receptionist"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/reception/boutique-stock" element={<ProtectedRoute allowedRoles={["receptionist"]}><BoutiqueStockRequestsPage /></ProtectedRoute>} />
      <Route path="/reception/binding-stock" element={<ProtectedRoute allowedRoles={["receptionist"]}><BindingStockRequestsPage /></ProtectedRoute>} />
      <Route path="/reception/material-requests" element={<ProtectedRoute allowedRoles={["receptionist"]}><ReceptionMaterialRequestPage /></ProtectedRoute>} />
      <Route path="/reception/sheets" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><SheetsPage /></ProtectedRoute>} />

      {/* Sales Officer Routes */}
      <Route path="/sales" element={<ProtectedRoute allowedRoles={["sales"]}><SalesPage /></ProtectedRoute>} />
      <Route path="/sales/proformas" element={<ProtectedRoute allowedRoles={["sales"]} pageId="quotations"><ProformasPage /></ProtectedRoute>} />
      <Route path="/sales/jobs" element={<ProtectedRoute allowedRoles={["sales"]} pageId="jobs"><JobManagementPage /></ProtectedRoute>} />
      <Route path="/sales/performaInvoice" element={<ProtectedRoute allowedRoles={["sales"]} pageId="proforma"><ProformaInvoicePage /></ProtectedRoute>} />
      <Route path="/sales/notifications" element={<ProtectedRoute allowedRoles={["sales"]}><NotificationsPage userRole="sales" userName="Sales Officer" /></ProtectedRoute>} />
      <Route path="/sales/profile" element={<ProtectedRoute allowedRoles={["sales"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/sales/stocks" element={<ProtectedRoute allowedRoles={["sales"]} pageId="stocks"><SalesStockPage /></ProtectedRoute>} />
      <Route path="/sales/customers" element={<ProtectedRoute allowedRoles={["sales"]} pageId="customers"><SalesCustomerPage /></ProtectedRoute>} />
      <Route path="/sales/reports" element={<ProtectedRoute allowedRoles={["sales"]}><SalesReportsPage /></ProtectedRoute>} />
      <Route path="/sales/reports/my" element={<ProtectedRoute allowedRoles={["sales"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/sales/leave" element={<ProtectedRoute allowedRoles={["sales"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/sales/overtime" element={<ProtectedRoute allowedRoles={["sales"]}><MyOvertimePage /></ProtectedRoute>} />




      {/* Finance Routes */}
      {/* DAF Routes */}
      <Route path="/finance/daf" element={<ProtectedRoute allowedRoles={["daf"]}><DAFPage /></ProtectedRoute>} />
      <Route path="/finance/daf/control" element={<ProtectedRoute allowedRoles={["daf"]}><FinanceControlPage /></ProtectedRoute>} />
      <Route path="/finance/daf/hr" element={<ProtectedRoute allowedRoles={["daf"]}><EmployeesPage /></ProtectedRoute>} />
      <Route path="/finance/daf/abanyabiraka" element={<ProtectedRoute allowedRoles={["daf"]}><Abanyabiraka /></ProtectedRoute>} />
      <Route path="/finance/daf/payroll" element={<ProtectedRoute allowedRoles={["daf"]}><PayrollPage /></ProtectedRoute>} />
      <Route path="/finance/daf/reports" element={<ProtectedRoute allowedRoles={["daf"]}><DAFReportsPage /></ProtectedRoute>} />
      <Route path="/finance/daf/reports/my" element={<ProtectedRoute allowedRoles={["daf"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/finance/daf/approvals" element={<ProtectedRoute allowedRoles={["daf", "hr"]}><DAFJobApprovalPage /></ProtectedRoute>} />
      <Route path="/finance/daf/notifications" element={<ProtectedRoute allowedRoles={["daf"]}><NotificationsPage userRole="daf" userName="DAF" /></ProtectedRoute>} />
      <Route path="/finance/daf/profile" element={<ProtectedRoute allowedRoles={["daf"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/finance/daf/overtime" element={<ProtectedRoute allowedRoles={["daf"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/finance/daf/proforma" element={<ProtectedRoute allowedRoles={["daf"]}><ProformasPage /></ProtectedRoute>} />
      <Route path="/finance/daf/procurement" element={<ProtectedRoute allowedRoles={["daf", "hr"]}><ProdurementPage /></ProtectedRoute>} />
      <Route path="/finance/daf/recovery" element={<ProtectedRoute allowedRoles={["daf"]}><Accountant2RecoveryPage /></ProtectedRoute>} />
      <Route path="/finance/daf/operations" element={<ProtectedRoute allowedRoles={["daf"]}><Operations /></ProtectedRoute>} />
      <Route path="/finance/daf/stock/general" element={<ProtectedRoute allowedRoles={["daf"]}><AdminGeneralStockPage /></ProtectedRoute>} />
      <Route path="/finance/daf/stock/boutique" element={<ProtectedRoute allowedRoles={["daf"]}><AdminBoutiqueStockPage /></ProtectedRoute>} />
      <Route path="/finance/daf/stock/binding" element={<ProtectedRoute allowedRoles={["daf"]}><AdminBindingStockPage /></ProtectedRoute>} />
      <Route path="/finance/daf/stock-requests" element={<ProtectedRoute allowedRoles={["daf", "admin"]}><StockRequestsPage /></ProtectedRoute>} />
      <Route path="/finance/daf/general-stock-requests" element={<ProtectedRoute allowedRoles={["daf", "admin"]}><DAFGeneralStockRequestsPage /></ProtectedRoute>} />
      <Route path="/finance/daf/reception-requests" element={<ProtectedRoute allowedRoles={["daf", "admin"]}><ReceptionMaterialRequestPage /></ProtectedRoute>} />
      <Route path="/finance/daf/extra-workers" element={<ProtectedRoute allowedRoles={["daf"]}><ExtraWorkersPage /></ProtectedRoute>} />
      <Route path="/finance/daf/overtime-management" element={<ProtectedRoute allowedRoles={["daf"]}><OvertimeManagementPage /></ProtectedRoute>} />
      <Route path="/finance/daf/departments" element={<ProtectedRoute allowedRoles={["daf"]}><AdminDepartmentsPage userRole="daf" /></ProtectedRoute>} />
      <Route path="/finance/daf/production" element={<ProtectedRoute allowedRoles={["daf"]}><ProductionOverviewPage userRole="daf" /></ProtectedRoute>} />

      {/* Accountant Routes - Unified */}
      <Route path="/finance/accountant1" element={<ProtectedRoute allowedRoles={["accountant"]}><Accountant1Page /></ProtectedRoute>} />
      <Route path="/finance/accountant1/invoices" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="invoices"><Accountant1InvoicesPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/payments" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="payments"><Accountant1PaymentsPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/documents" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="documents"><Accountant1DocumentsPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/notifications" element={<ProtectedRoute allowedRoles={["accountant"]}><NotificationsPage userRole="accountant" userName="Accountant" /></ProtectedRoute>} />
      <Route path="/finance/accountant1/profile" element={<ProtectedRoute allowedRoles={["accountant"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/operations" element={<ProtectedRoute allowedRoles={["accountant"]}><Operations /></ProtectedRoute>} />
      <Route path="/finance/accountant1/proformas" element={<ProtectedRoute allowedRoles={["accountant"]}><ProformasPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/leave" element={<ProtectedRoute allowedRoles={["accountant"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/overtime" element={<ProtectedRoute allowedRoles={["accountant"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/reports" element={<ProtectedRoute allowedRoles={["accountant"]}><AccountantReportsPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/reports/my" element={<ProtectedRoute allowedRoles={["accountant"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/finance/accountant2" element={<ProtectedRoute allowedRoles={["accountant"]}><Accountant2Page /></ProtectedRoute>} />
      <Route path="/finance/accountant2/procurement" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="procurement"><Accountant2ProcurementPage /></ProtectedRoute>} />
      <Route path="/finance/accountant2/taxes" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="taxes"><Accountant2TaxesPage /></ProtectedRoute>} />
      <Route path="/finance/accountant2/recovery" element={<ProtectedRoute allowedRoles={["accountant"]} pageId="recovery"><Accountant2RecoveryPage /></ProtectedRoute>} />
      <Route path="/finance/accountant2/notifications" element={<ProtectedRoute allowedRoles={["accountant"]}><NotificationsPage userRole="accountant" userName="Accountant" /></ProtectedRoute>} />

      {/* Production Manager Routes */}
      <Route path="/production-manager" element={<ProtectedRoute allowedRoles={["production-manager"]}><ProductionManagerPage /></ProtectedRoute>} />
      <Route path="/production-manager/planning" element={<ProtectedRoute allowedRoles={["production-manager"]}><JobAssignmentPage /></ProtectedRoute>} />
      <Route path="/production-manager/departments" element={<ProtectedRoute allowedRoles={["production-manager"]}><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/production-manager/general-stock" element={<ProtectedRoute allowedRoles={["production-manager"]}><GeneralStockPageOnPm /></ProtectedRoute>} />
      <Route path="/production-manager/binding-stock" element={<ProtectedRoute allowedRoles={["production-manager"]}><PMBindingStockPage /></ProtectedRoute>} />
      <Route path="/production-manager/extra-workers" element={<ProtectedRoute allowedRoles={["production-manager"]}><ExtraWorkersPage /></ProtectedRoute>} />
      <Route path="/production-manager/samples" element={<ProtectedRoute allowedRoles={["production-manager"]}><PMSamplesPage /></ProtectedRoute>} />
      <Route path="/production-manager/reports" element={<ProtectedRoute allowedRoles={["production-manager"]}><ProductionManagerReportsPage /></ProtectedRoute>} />
      <Route path="/production-manager/reports/my" element={<ProtectedRoute allowedRoles={["production-manager"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/production-manager/leave" element={<ProtectedRoute allowedRoles={["production-manager"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/production-manager/overtime" element={<ProtectedRoute allowedRoles={["production-manager"]}><MyOvertimePage /></ProtectedRoute>} />
      {/* <Route path="/production-manager/progress" element={<ProtectedRoute allowedRoles={["production-manager"]}><ProgressPage /></ProtectedRoute>} /> */}
      <Route path="/production-manager/notifications" element={<ProtectedRoute allowedRoles={["production-manager"]}><NotificationsPage userRole="production-manager" userName="Production Manager" /></ProtectedRoute>} />
      <Route path="/production-manager/profile" element={<ProtectedRoute allowedRoles={["production-manager"]}><ProfilePage /></ProtectedRoute>} />

      {/* Stock Department Routes */}
      <Route path="/stock" element={<ProtectedRoute allowedRoles={["stock"]}><StockPage /></ProtectedRoute>} />
      <Route path="/stock/suppliers" element={<ProtectedRoute allowedRoles={["stock"]}><SuppliersPage /></ProtectedRoute>} />
      <Route path="/stock/leave" element={<ProtectedRoute allowedRoles={["stock"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/stock/overtime" element={<ProtectedRoute allowedRoles={["stock"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/stock/notifications" element={<ProtectedRoute allowedRoles={["stock"]}><NotificationsPage userRole="stock" userName="Stock Manager" /></ProtectedRoute>} />
      <Route path="/stock/profile" element={<ProtectedRoute allowedRoles={["stock"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/stock/reports" element={<ProtectedRoute allowedRoles={["stock"]}><StockReportsPage /></ProtectedRoute>} />
      <Route path="/stock/reports/my" element={<ProtectedRoute allowedRoles={["stock"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/stock/boutique-stock" element={<ProtectedRoute allowedRoles={["stock"]}><BoutiqueStockPage /></ProtectedRoute>} />
      <Route path="/stock/general-stock" element={<ProtectedRoute allowedRoles={["stock"]}><GeneralStockPage /></ProtectedRoute>} />
      <Route path="/stock/requests" element={<ProtectedRoute allowedRoles={["stock"]}><StockRequestsPage /></ProtectedRoute>} />

      {/* Supervisor Routes */}
      <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorPage /></ProtectedRoute>} />
      <Route path="/supervisor/jobs" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorJobAssignmentPage /></ProtectedRoute>} />
      <Route path="/supervisor/production" element={<ProtectedRoute allowedRoles={["supervisor"]}><ProductionPage /></ProtectedRoute>} />
      <Route path="/supervisor/employees" element={<ProtectedRoute allowedRoles={["supervisor"]}><DepartmentEmployeesPage /></ProtectedRoute>} />
      <Route path="/supervisor/workers" element={<Navigate to="/supervisor/employees" replace />} />
      <Route path="/supervisor/reports" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorReportsPage /></ProtectedRoute>} />
      <Route path="/supervisor/reports/review" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorReviewReportsPage /></ProtectedRoute>} />
      <Route path="/supervisor/reports/my" element={<ProtectedRoute allowedRoles={["supervisor"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/supervisor/leave" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorLeavePage /></ProtectedRoute>} />
      <Route path="/supervisor/overtime" element={<ProtectedRoute allowedRoles={["supervisor"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/supervisor/binding-stock" element={<ProtectedRoute allowedRoles={["supervisor"]}><BindingStockPage /></ProtectedRoute>} />
      <Route path="/supervisor/machines" element={<ProtectedRoute allowedRoles={["supervisor"]}><MachinesPage /></ProtectedRoute>} />
      <Route path="/supervisor/samples" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorSamplesPage /></ProtectedRoute>} />
      <Route path="/supervisor/materials" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorMaterialRequestPage /></ProtectedRoute>} />
      <Route path="/supervisor/extra-workers" element={<ProtectedRoute allowedRoles={["supervisor"]}><ExtraWorkersPage /></ProtectedRoute>} />
      <Route path="/supervisor/notifications" element={<ProtectedRoute allowedRoles={["supervisor"]}><NotificationsPage userRole="supervisor" userName="Supervisor" /></ProtectedRoute>} />
      <Route path="/supervisor/profile" element={<ProtectedRoute allowedRoles={["supervisor"]}><ProfilePage /></ProtectedRoute>} />

      {/* Worker Routes */}
      <Route path="/worker" element={<ProtectedRoute allowedRoles={["worker"]}><WorkerPage /></ProtectedRoute>} />
      <Route path="/worker/tasks" element={<ProtectedRoute allowedRoles={["worker"]} pageId="tasks"><TaskManagementPage /></ProtectedRoute>} />
      <Route path="/worker/time-logs" element={<ProtectedRoute allowedRoles={["worker"]} pageId="time-logs"><TimeLogsPage /></ProtectedRoute>} />
      <Route path="/worker/stats" element={<ProtectedRoute allowedRoles={["worker"]}><StatsPage /></ProtectedRoute>} />
      <Route path="/worker/reports" element={<ProtectedRoute allowedRoles={["worker"]}><WorkerReportsPage /></ProtectedRoute>} />
      <Route path="/worker/reports/my" element={<ProtectedRoute allowedRoles={["worker"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/worker/materials" element={<ProtectedRoute allowedRoles={["worker"]} pageId="material-requests"><MaterialRequestPage /></ProtectedRoute>} />
      <Route path="/worker/leave" element={<ProtectedRoute allowedRoles={["worker"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/worker/overtime" element={<ProtectedRoute allowedRoles={["worker"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/worker/notifications" element={<ProtectedRoute allowedRoles={["worker"]}><NotificationsPage userRole="worker" userName="Worker" /></ProtectedRoute>} />
      <Route path="/worker/profile" element={<ProtectedRoute allowedRoles={["worker"]}><ProfilePage /></ProtectedRoute>} />

      {/* Hobe */}
      <Route path="/hobe" element={<ProtectedRoute allowedRoles={["hobe"]}><HobePage /></ProtectedRoute>} />
      <Route path="/hobe/requests" element={<ProtectedRoute allowedRoles={["hobe"]}><RequestsPage /></ProtectedRoute>} />
      <Route path="/hobe/jobs" element={<ProtectedRoute allowedRoles={["hobe"]}><JobPage /></ProtectedRoute>} />
      <Route path="/hobe/leave" element={<ProtectedRoute allowedRoles={["hobe"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/hobe/overtime" element={<ProtectedRoute allowedRoles={["hobe"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/hobe/trade" element={<ProtectedRoute allowedRoles={["hobe"]}><HobeTrade /></ProtectedRoute>} />
      <Route path="/hobe/report" element={<ProtectedRoute allowedRoles={["hobe"]}><ReportsPage /></ProtectedRoute>} />
      <Route path="/hobe/report/my-reports" element={<ProtectedRoute allowedRoles={["hobe"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/hobe/notifications" element={<ProtectedRoute allowedRoles={["hobe"]}><NotificationsPage userRole="hobe" userName="Hobe" /></ProtectedRoute>} />
      <Route path="/hobe/profile" element={<ProtectedRoute allowedRoles={["hobe"]}><ProfilePage /></ProtectedRoute>} />

      {/* routes for Cashier */}
      <Route path="/cashier" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierDashboard /></ProtectedRoute>} />
      <Route path="/cashier/payments" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierPaymentsPage /></ProtectedRoute>} />
      <Route path="/cashier/payments/jobs" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierPaymentsPage /></ProtectedRoute>} />
      <Route path="/cashier/payments/boutique" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierBoutiquePaymentsPage /></ProtectedRoute>} />
      <Route path="/cashier/withdrows" element={<ProtectedRoute allowedRoles={["cashier"]}><Withdraws /></ProtectedRoute>} />
      <Route path="/cashier/expenses" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierExpensesPage /></ProtectedRoute>} />
      <Route path="/cashier/casual-workers" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierCasualWorkersPage /></ProtectedRoute>} />
      <Route path="/cashier/cashier" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierPage /></ProtectedRoute>} />
      <Route path="/cashier/notifications" element={<ProtectedRoute allowedRoles={["cashier"]}><NotificationsPage userRole="cashier" userName="Cashier" /></ProtectedRoute>} />
      <Route path="/cashier/profile" element={<ProtectedRoute allowedRoles={["cashier"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/cashier/guide" element={<ProtectedRoute allowedRoles={["cashier"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/cashier/leave" element={<ProtectedRoute allowedRoles={["cashier"]}><MyLeavePage /></ProtectedRoute>} />
      <Route path="/cashier/overtime" element={<ProtectedRoute allowedRoles={["cashier"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/cashier/reports" element={<ProtectedRoute allowedRoles={["cashier"]}><CashierReportsPage /></ProtectedRoute>} />
      <Route path="/cashier/reports/my" element={<ProtectedRoute allowedRoles={["cashier"]}><MyReportsPage /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute allowedRoles={["hr"]}><HRPage /></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={["hr"]}><EmployeesPage /></ProtectedRoute>} />
      <Route path="/hr/leave" element={<ProtectedRoute allowedRoles={["hr", "daf"]}><HRLeaveManagementPage /></ProtectedRoute>} />
      <Route path="/hr/overtime" element={<ProtectedRoute allowedRoles={["hr"]}><MyOvertimePage /></ProtectedRoute>} />
      <Route path="/hr/notifications" element={<ProtectedRoute allowedRoles={["hr"]}><NotificationsPage userRole="hr" userName="HR" /></ProtectedRoute>} />
      <Route path="/hr/profile" element={<ProtectedRoute allowedRoles={["hr"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/hr/abanyabiraka" element={<ProtectedRoute allowedRoles={["hr"]}><Abanyabiraka /></ProtectedRoute>} />
      <Route path="/hr/payroll" element={<ProtectedRoute allowedRoles={["hr"]}><PayrollPage /></ProtectedRoute>} />
      <Route path="/hr/reports" element={<ProtectedRoute allowedRoles={["hr"]}><HRReportsPage /></ProtectedRoute>} />
      <Route path="/hr/reports/my" element={<ProtectedRoute allowedRoles={["hr"]}><MyReportsPage /></ProtectedRoute>} />
      {/* Public Routes with Layout (if needed) */}
      <Route element={<Layout />}>
        {/* Add public page routes here if needed */}
      </Route>

      {/* User Guide Routes */}
      <Route path="/reception/guide" element={<ProtectedRoute allowedRoles={["receptionist"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/sales/guide" element={<ProtectedRoute allowedRoles={["sales"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/finance/daf/guide" element={<ProtectedRoute allowedRoles={["daf"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/hobe/guide" element={<ProtectedRoute allowedRoles={["hobe"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/supervisor/guide" element={<ProtectedRoute allowedRoles={["supervisor"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/worker/guide" element={<ProtectedRoute allowedRoles={["worker"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/hr/guide" element={<ProtectedRoute allowedRoles={["hr"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/stock/guide" element={<ProtectedRoute allowedRoles={["stock"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/production-manager/guide" element={<ProtectedRoute allowedRoles={["production-manager"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/finance/accountant1/guide" element={<ProtectedRoute allowedRoles={["accountant"]}><UserGuidesPage /></ProtectedRoute>} />
      <Route path="/admin/guide" element={<ProtectedRoute allowedRoles={["admin"]}><UserGuidesPage /></ProtectedRoute>} />

      {/* Default redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 — redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
