import {
  HiOutlineArchive,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineChevronDown,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineCog,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineCash,
  HiOutlineTrendingUp,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineMenu,
  HiOutlineQuestionMarkCircle,
  HiOutlineUsers,
  HiOutlineViewGrid,
  HiOutlineX
} from "react-icons/hi";
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { type UserRole } from "../context/AuthContext";
import { useAppSelector } from "../store/hooks";
import { useGetMyPermissionsQuery } from "../store/services/permissionsService";
import { useGetUnreadCountQuery } from "../store/services/notificationsService";
import { useGetDepartmentByIdQuery } from "../store/services/departmentsService";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey?: string;
  /** When true, only visible to supervisors in the binding department */
  bindingOnly?: boolean;
  children?: { label: string; path: string; icon: React.ComponentType<{ className?: string }> }[];
}

interface DashboardSidebarProps {
  userRole: UserRole;
  userName?: string;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

const menuItems: Record<UserRole, MenuItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: HiOutlineHome },
    { label: "Users", path: "/admin/users", icon: HiOutlineUsers },
    { label: "Customers", path: "/admin/customers", icon: HiOutlineUsers },
    { label: "Employees", path: "/admin/employees", icon: HiOutlineUsers },
    { label: "Casual Workers", path: "/admin/abanyabiraka", icon: HiOutlineUsers },
    { label: "Extra Workers", path: "/admin/extra-workers", icon: HiOutlineUsers },
    { label: "Emp Overtime", path: "/admin/overtime", icon: HiOutlineClock },
    { label: "Payroll", path: "/admin/payroll", icon: HiOutlineCurrencyDollar },
    { label: "Jobs", path: "/admin/jobs", icon: HiOutlineClipboardList },
    { label: "Deliveries", path: "/admin/deliveries", icon: HiOutlineArchive },
    { label: "Procurement", path: "/admin/procurement", icon: HiOutlineArchive },
    { label: "Departments", path: "/admin/departments", icon: HiOutlineUsers },
    { label: "Production", path: "/admin/production", icon: HiOutlineCube },
    { label: "Machines", path: "/admin/machines", icon: HiOutlineCog },
    { label: "Sales", path: "/admin/sales", icon: HiOutlineBriefcase },
    { label: "Proforma Invoice", path: "/admin/proformas", icon: HiOutlineDocumentText },
    { label: "Finance", path: "/admin/finance", icon: HiOutlineCurrencyDollar },
    { label: "Expenses", path: "/admin/expenses", icon: HiOutlineCash },
    { label: "Withdrawals", path: "/admin/withdrawals", icon: HiOutlineTrendingUp },
    { label: "Recovery", path: "/admin/recovery", icon: HiOutlineCurrencyDollar },
    { label: "Operations", path: "/admin/operations", icon: HiOutlineClipboardList },
    {
      label: "Stock", path: "/admin/stock", icon: HiOutlineArchive, children: [
        { label: "General Stock", path: "/admin/stock/general", icon: HiOutlineArchive },
        { label: "Boutique Stock", path: "/admin/stock/boutique", icon: HiOutlineArchive },
        { label: "Binding Stock", path: "/admin/stock/binding", icon: HiOutlineArchive },
      ]
    },
    // { label: "Reports", path: "/admin/reports", icon: HiOutlineChartBar, permissionKey: "reports.view" },
    // { label: "Workflow Config", path: "/admin/workflow", icon: HiOutlineAdjustments, permissionKey: "workflow_config.view" },
    {
      label: "Manage Permissions", path: "/admin/leave", icon: HiOutlineCalendar,
      children: [
        {label: "Existing Leave", path: "/admin/leave", icon: HiOutlineCalendar },
        { label: "Annual Leave", path: "/admin/annual-leave", icon: HiOutlineUsers },
        { label: "Permissions", path: "/admin/leave", icon: HiOutlineCalendar },
        { label: " Circum... Leave", path: "/admin/leave", icon: HiOutlineCalendar },
      ]
    },
    { label: "View Reports", path: "/admin/reports/view", icon: HiOutlineDocumentText },
    // { label: "UI Permissions", path: "/admin/ui-permissions", icon: HiOutlineViewGrid},
  ],
  receptionist: [
    { label: "Dashboard", path: "/reception", icon: HiOutlineHome },
    { label: "Visitor", path: "/reception/visitor", icon: HiOutlineClipboardList, },
    { label: "Payments", path: "/reception/payments", icon: HiOutlineCurrencyDollar },
    { label: "Deliveries", path: "/reception/deliveries", icon: HiOutlineArchive },
    {
      label: "Boutique", path: "/reception/boutique", icon: HiOutlineViewGrid,
      children: [
        { label: "Trade Product", path: "/reception/boutique", icon: HiOutlineViewGrid },
        { label: "Recently Trade", path: "/reception/boutique/recently", icon: HiOutlineClipboardList },
      ]
    },
    { label: "Boutique Stock", path: "/reception/boutique-stock", icon: HiOutlineArchive },
    { label: "Binding Stock", path: "/reception/binding-stock", icon: HiOutlineArchive },
    { label: "Material Requests", path: "/reception/material-requests", icon: HiOutlineClipboardList },
    { label: "Sheets", path: "/reception/sheets", icon: HiOutlineDocumentText },
    { label: "My Leave", path: "/reception/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/reception/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/reception/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/reception/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  sales: [
    { label: "Dashboard", path: "/sales", icon: HiOutlineHome },
    { label: "Jobs", path: "/sales/jobs", icon: HiOutlineBriefcase },
    { label: "Stock", path: "/sales/stocks", icon: HiOutlineArchive },
    { label: "Porforma Invoice", path: "/sales/proformas", icon: HiOutlineDocumentText },
    // { label: "Performa Invoice", path: "/sales/performaInvoice", icon: HiOutlineCurrencyDollar, permissionKey: "invoices.view" },
    { label: "My Leave", path: "/sales/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/sales/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/sales/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/sales/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  hr: [
    { label: "Dashboard", path: "/hr", icon: HiOutlineHome },
    { label: "Employees", path: "/hr/employees", icon: HiOutlineUsers },
    { label: "Job Approvals", path: "/finance/daf/approvals", icon: HiOutlineClipboardList },
    { label: "Procurement", path: "/finance/daf/procurement", icon: HiOutlineArchive },
    { label: "Casual Workers", path: "/hr/abanyabiraka", icon: HiOutlineUsers },
    { label: "Payroll", path: "/hr/payroll", icon: HiOutlineCurrencyDollar },
    { label: "Manage Permissions", path: "/hr/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/hr/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/hr/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/hr/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],

  hobe: [
    { label: "Dashboard", path: "/hobe", icon: HiOutlineHome },
    { label: "Trade", path: "/hobe/trade", icon: HiOutlineCube },
    { label: "Job", path: "/hobe/jobs", icon: HiOutlineBriefcase },
    { label: "Requests", path: "/hobe/requests", icon: HiOutlineClipboardList },
    { label: "My Leave", path: "/hobe/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/hobe/report", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/hobe/report", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/hobe/report/my-reports", icon: HiOutlineDocumentText },
      ]
    },
  ],
  daf: [
    { label: "Dashboard", path: "/finance/daf", icon: HiOutlineHome },
    { label: "Job Approvals", path: "/finance/daf/approvals", icon: HiOutlineClipboardList },
    // { label: "Finance Control", path: "/finance/daf/control", icon: HiOutlineCurrencyDollar },
    { label: "Employees", path: "/finance/daf/hr", icon: HiOutlineUsers },
    { label: "Causal Workers", path: "/finance/daf/abanyabiraka", icon: HiOutlineCurrencyDollar },
    { label: "Payroll", path: "/finance/daf/payroll", icon: HiOutlineCurrencyDollar },
    // { label: "Quotations", path: "/finance/daf/quatation", icon: HiOutlineAdjustments, permissionKey: "finance.view" },
    {
      label: "Stock", path: "/finance/daf/stock", icon: HiOutlineArchive, children: [
        { label: "General Stock", path: "/finance/daf/stock/general", icon: HiOutlineArchive },
        { label: "Boutique Stock", path: "/finance/daf/stock/boutique", icon: HiOutlineArchive },
        { label: "Binding Stock", path: "/finance/daf/stock/binding", icon: HiOutlineArchive },
      ]
    },
    { label: "Departments", path: "/finance/daf/departments", icon: HiOutlineUsers },
    { label: "Production", path: "/finance/daf/production", icon: HiOutlineCube },
    {
      label: "Requests", path: "/finance/daf/requests", icon: HiOutlineClipboardList, children: [
        { label: "Stock Manager", path: "/finance/daf/stock-requests", icon: HiOutlineClipboardList },
        { label: "General Stock", path: "/finance/daf/general-stock-requests", icon: HiOutlineArchive },
        { label: "Receptionalist", path: "/finance/daf/reception-requests", icon: HiOutlineClipboardList },
        { label: "Procurement", path: "/finance/daf/procurement", icon: HiOutlineArchive },
      ]
    },
    { label: "Proforma Invoice", path: "/finance/daf/proforma", icon: HiOutlineDocumentText },
    { label: "Recovery", path: "/finance/daf/recovery", icon: HiOutlineCurrencyDollar },
    { label: "Operations", path: "/finance/daf/operations", icon: HiOutlineClipboardList },
    { label: "Extra Workers", path: "/finance/daf/extra-workers", icon: HiOutlineUsers },
    { label: "Emp Overtime", path: "/finance/daf/overtime-management", icon: HiOutlineClock },
    { label: "Permissions", path: "/hr/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/finance/daf/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/finance/daf/reports", icon: HiOutlineChartBar },
        { label: "Reports", path: "/finance/daf/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  accountant: [
    { label: "Dashboard", path: "/finance/accountant1", icon: HiOutlineHome },
    { label: "Payments", path: "/finance/accountant1/payments", icon: HiOutlineCurrencyDollar },
    { label: "Porforma Invoice", path: "/finance/accountant1/proformas", icon: HiOutlineDocumentText },

    // { label: "Invoices", path: "/finance/accountant1/invoices", icon: HiOutlineDocumentText },
    // { label: "Documents", path: "/finance/accountant1/documents", icon: HiOutlineClipboardList },
    { label: "Operations", path: "/finance/accountant1/operations", icon: HiOutlineClipboardList },
    { label: "Proforma Invoice", path: "/finance/accountant1/proformas", icon: HiOutlineDocumentText },
    { label: "Recovery", path: "/finance/accountant2/recovery", icon: HiOutlineCurrencyDollar },
    { label: "Payroll", path: "/finance/accountant1/payroll", icon: HiOutlineCurrencyDollar },
    { label: "My Leave", path: "/finance/accountant1/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/finance/accountant1/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/finance/accountant1/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/finance/accountant1/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  "production-manager": [
    { label: "Dashboard", path: "/production-manager", icon: HiOutlineHome },
    { label: "Job Planning", path: "/production-manager/planning", icon: HiOutlineClipboardList },
    { label: "General Stock", path: "/production-manager/general-stock", icon: HiOutlineArchive },
    { label: "Binding Stock", path: "/production-manager/binding-stock", icon: HiOutlineArchive },
    { label: "Extra Workers", path: "/production-manager/extra-workers", icon: HiOutlineUsers },
    { label: "Departments", path: "/production-manager/departments", icon: HiOutlineUsers },
    {
      label: "Samples", path: "/production-manager/samples", icon: HiOutlineClipboardList, children: [
        { label: "All Samples", path: "/production-manager/samples", icon: HiOutlineClipboardList },
      ]
    },
    { label: "My Leave", path: "/production-manager/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/production-manager/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/production-manager/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/production-manager/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  stock: [
    { label: "Dashboard", path: "/stock", icon: HiOutlineHome },
    { label: "Boutique Stock", path: "/stock/boutique-stock", icon: HiOutlineArchive },
    { label: "General Stock", path: "/stock/general-stock", icon: HiOutlineCube },
    { label: "Stock Requests", path: "/stock/requests", icon: HiOutlineClipboardList },
    // { label: "Suppliers", path: "/stock/suppliers", icon: HiOutlineUsers, permissionKey: "suppliers.view" },
    { label: "My Leave", path: "/stock/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/stock/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/stock/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/stock/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  supervisor: [
    { label: "Dashboard", path: "/supervisor", icon: HiOutlineHome },
    { label: "Jobs", path: "/supervisor/jobs", icon: HiOutlineClipboardList },
    { label: "Employees", path: "/supervisor/employees", icon: HiOutlineUsers },
    { label: "Machines", path: "/supervisor/machines", icon: HiOutlineCog },
    { label: "Samples", path: "/supervisor/samples", icon: HiOutlineDocumentText },
    { label: "Binding Stock", path: "/supervisor/binding-stock", icon: HiOutlineArchive, bindingOnly: true },
    { label: "Extra Workers", path: "/supervisor/extra-workers", icon: HiOutlineUsers, bindingOnly: true },
    { label: "Material Requests", path: "/supervisor/materials", icon: HiOutlineCube },
    { label: "My Leave", path: "/supervisor/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/supervisor/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/supervisor/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/supervisor/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  cashier: [
    { label: "Dashboard", path: "/cashier", icon: HiOutlineHome },
    {
      label: "Payments", path: "/cashier/payments", icon: HiOutlineCurrencyDollar,
      children: [
        { label: "Jobs", path: "/cashier/payments/jobs", icon: HiOutlineBriefcase },
        { label: "Boutique Products", path: "/cashier/payments/boutique", icon: HiOutlineViewGrid },
      ]
    },
    { label: "Withdraws", path: "/cashier/withdrows", icon: HiOutlineCurrencyDollar },
    { label: "Expenses", path: "/cashier/expenses", icon: HiOutlineDocumentText },
    { label: "Casual Workers", path: "/cashier/casual-workers", icon: HiOutlineUsers },
    { label: "My Leave", path: "/cashier/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/cashier/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/cashier/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/cashier/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
  worker: [
    { label: "My Jobs", path: "/worker", icon: HiOutlineHome },
    { label: "Task Board", path: "/worker/tasks", icon: HiOutlineClipboardList },
    { label: "Material Requests", path: "/worker/materials", icon: HiOutlineArchive },
    { label: "My Overtime", path: "/worker/overtime", icon: HiOutlineClock },
    { label: "My Leave", path: "/worker/leave", icon: HiOutlineCalendar },
    {
      label: "Reports", path: "/worker/reports", icon: HiOutlineChartBar, children: [
        { label: "Generate Reports", path: "/worker/reports", icon: HiOutlineChartBar },
        { label: "My Reports", path: "/worker/reports/my", icon: HiOutlineDocumentText },
      ]
    },
  ],
};

export default function DashboardSidebar({
  userRole,
  userName = "User",
  isCollapsed,
  isMobileOpen,
  onToggle,
  onMobileClose,
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const isUserClick = useRef(false);

  // Scroll active item into view on initial mount and on programmatic navigation,
  // but NOT when the user clicked a sidebar item (they can already see it).
  useEffect(() => {
    if (isUserClick.current) {
      isUserClick.current = false;
      return;
    }
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>("[data-active='true']");
    if (active) {
      const navTop = nav.scrollTop;
      const navBottom = navTop + nav.clientHeight;
      const itemTop = active.offsetTop;
      const itemBottom = itemTop + active.offsetHeight;
      if (itemTop < navTop || itemBottom > navBottom) {
        nav.scrollTop = itemTop - nav.clientHeight / 2 + active.offsetHeight / 2;
      }
    }
  }, [location.pathname]);
  const { token } = useAppSelector((state) => state.auth);
  const departmentId = useAppSelector((state) => state.auth.user?.departmentId);

  // Fetch the supervisor's department to check if they're in binding
  const { data: myDepartment } = useGetDepartmentByIdQuery(departmentId ?? "", {
    skip: !departmentId || userRole !== "supervisor",
  });

  const isBindingSupervisor =
    userRole === "supervisor" &&
    !!myDepartment &&
    (myDepartment.name.toLowerCase().includes("binding") ||
      myDepartment.name.toLowerCase().includes("finishing"));
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(() => {
    // Auto-open dropdowns whose children match the current path on mount
    const initial = new Set<string>();
    Object.values(menuItems).flat().forEach((item) => {
      if (item.children?.some((c) => window.location.pathname === c.path)) {
        initial.add(item.path);
      }
    });
    return initial;
  });
  const { data: myPermissions = [], isSuccess } = useGetMyPermissionsQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, {
    skip: !token,
    pollingInterval: 30_000,
  });

  const toggleDropdown = (path: string) =>
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const grantedSet = useMemo(() => {
    const s = new Set(myPermissions.map((p) => p.name));
    if (isSuccess) {
      console.log(`[sidebar] role=${userRole} | granted permissions (${s.size}):`, [...s].sort());
    }
    return s;
  }, [myPermissions, isSuccess, userRole]);

  // Always use the hardcoded menuItems — no localStorage / UIPermissions config involved
  const items = useMemo(() => {
    const base = menuItems[userRole] ?? [];
    const filtered = base.filter(
      (item) =>
        (!item.permissionKey || grantedSet.has(item.permissionKey)) &&
        (!item.bindingOnly || isBindingSupervisor)
    );
    console.log(
      `[sidebar] visible items (${filtered.length}/${base.length}):`,
      filtered.map((i) => i.label),
      "| blocked:",
      base
        .filter((i) => i.permissionKey && !grantedSet.has(i.permissionKey!))
        .map((i) => `${i.label}(${i.permissionKey})`)
    );
    return filtered;
  }, [userRole, grantedSet, isBindingSupervisor]);

  const notifPath: Record<UserRole, string> = {
    admin: "/admin/notifications",
    cashier: "/cashier/notifications",
    receptionist: "/reception/notifications",
    sales: "/sales/notifications",
    hr: "/hr/notifications",
    hobe: "/hobe/notifications",
    daf: "/finance/daf/notifications",
    accountant: "/finance/accountant1/notifications",
    "production-manager": "/production-manager/notifications",
    stock: "/stock/notifications",
    supervisor: "/supervisor/notifications",
    worker: "/worker/notifications",
  };

  const guidePath: Record<UserRole, string> = {
    admin: "/admin/guide",
    cashier: "/cashier/guide",
    receptionist: "/reception/guide",
    sales: "/sales/guide",
    hr: "/hr/guide",
    hobe: "/hobe/guide",
    daf: "/finance/daf/guide",
    accountant: "/finance/accountant1/guide",
    "production-manager": "/production-manager/guide",
    stock: "/stock/guide",
    supervisor: "/supervisor/guide",
    worker: "/worker/guide",
  };

  const settingsPath: Record<UserRole, string> = {
    admin: "/admin/profile",
    cashier: "/cashier/profile",
    receptionist: "/reception/profile",
    sales: "/sales/profile",
    hr: "/hr/profile",
    hobe: "/hobe/profile",
    daf: "/finance/daf/profile",
    accountant: "/finance/accountant1/profile",
    "production-manager": "/production-manager/profile",
    stock: "/stock/profile",
    supervisor: "/supervisor/profile",
    worker: "/worker/profile",
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-secondary-100/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          bg-style-600 border-r border-custom-300
          transition-all duration-300 ease-in-out
          z-50 flex flex-col
          font-[family-name:var(--font-family-primary)]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${isCollapsed ? "lg:w-20" : "w-64"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-custom-300">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary-300 flex items-center justify-center">
                <span className="text-secondary-200 font-bold text-sm">
                  <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg" />
                </span>
              </div>
              <span className="font-bold text-secondary-100 text-lg">Santrack</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-custom-100 transition-colors text-custom-700 hover:text-secondary-100"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <HiOutlineMenu className="w-5 h-5" />
            ) : (
              <HiOutlineX className="w-5 h-5 lg:hidden" onClick={onMobileClose} />
            )}
            {!isCollapsed && (
              <HiOutlineMenu className="w-5 h-5 hidden lg:block" />
            )}
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-custom-300 ${isCollapsed ? "hidden" : "block"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-secondary-100 text-sm truncate">{userName}</p>
              <p className="text-xs text-custom-700 capitalize">{userRole.replace("-", " ")}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const hasChildren = !!item.children?.length;
            const isDropdownOpen = openDropdowns.has(item.path);
            const childActive = item.children?.some((c) => location.pathname === c.path);

            return (
              <div key={item.path}>
                <button
                  data-active={(isActive || childActive) ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.currentTarget as HTMLButtonElement).blur();
                    if (hasChildren && !isCollapsed) {
                      toggleDropdown(item.path);
                    } else {
                      isUserClick.current = true;
                      navigate(item.path);
                      if (window.innerWidth < 1024) onMobileClose();
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200
                    ${(isActive || childActive)
                      ? "bg-primary-500 text-secondary-200"
                      : "text-custom-700 hover:bg-custom-100 hover:text-secondary-100"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {hasChildren && (
                        <HiOutlineChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                          }`} />
                      )}
                    </>
                  )}
                </button>

                {/* Children */}
                {hasChildren && !isCollapsed && isDropdownOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-custom-200 pl-3">
                    {item.children!.map((child) => {
                      const childIsActive = location.pathname === child.path;
                      return (
                        <button
                          key={child.path}
                          onClick={(e) => {
                            (e.currentTarget as HTMLButtonElement).blur();
                            isUserClick.current = true;
                            navigate(child.path);
                            if (window.innerWidth < 1024) onMobileClose();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${childIsActive
                            ? "bg-primary-100 text-primary-600 font-semibold"
                            : "text-custom-700 hover:bg-custom-100 hover:text-secondary-100"
                            }`}
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium text-sm">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-custom-300 space-y-1">
          <button
            onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); isUserClick.current = true; navigate(notifPath[userRole]); if (window.innerWidth < 1024) onMobileClose(); }}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${location.pathname === notifPath[userRole]
                ? "bg-primary-500 text-secondary-200"
                : "text-custom-700 hover:bg-custom-100 hover:text-secondary-100"
              } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Notifications" : undefined}
          >
            <HiOutlineBell className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm flex-1 text-left">Notifications</span>}
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); isUserClick.current = true; navigate(guidePath[userRole]); if (window.innerWidth < 1024) onMobileClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${location.pathname === guidePath[userRole]
                ? "bg-primary-500 text-secondary-200"
                : "text-custom-700 hover:bg-custom-100 hover:text-secondary-100"
              } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "User Guide" : undefined}
          >
            <HiOutlineQuestionMarkCircle className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">User Guide</span>}
          </button>
          <button
            onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); isUserClick.current = true; navigate(settingsPath[userRole]); if (window.innerWidth < 1024) onMobileClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${location.pathname === settingsPath[userRole]
                ? "bg-primary-500 text-secondary-200"
                : "text-custom-700 hover:bg-custom-100 hover:text-secondary-100"
              } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <HiOutlineCog className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">Settings</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
