// ═══════════════════════════════════════════════════════════════
// App — Root layout with MIS sidebar + router
// Phase 4B-9: Restructured from report-only to full MIS navigation
// Phase 4C-2: Redesigned to "MIS Dashboard Premium" format — navy
//             gradient sidebar, Lucide icons, collapsible nav.
// ═══════════════════════════════════════════════════════════════

import { Link, Outlet, useLocation, Navigate } from 'react-router';
import { Fragment, useState } from 'react';
import {
  LayoutDashboard, FilePenLine, Wrench, ClipboardList, FolderOpen,
  UserRound, FileText, CreditCard, Landmark, ChartSpline, UsersRound,
  ShieldCheck, BadgeCheck, Database, Wallet, LogOut, MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useProject } from './contexts/ProjectContext';

// ── Navigation structure ──────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const MIS_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MIS',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Entry', path: '/ep', icon: FilePenLine },
      { label: 'Data Quality', path: '/ep/invalid', icon: ShieldCheck },
      { label: 'Correction', path: '/corrections', icon: Wrench, adminOnly: true },
      { label: 'EPICAD', path: '/epicad', icon: ClipboardList },
      {
        label: 'Baseline',
        path: '/baseline',
        icon: FolderOpen,
        children: [
          { label: 'EP Details', path: 'eps', icon: UserRound },
          { label: 'Family Member', path: 'family-members', icon: UsersRound },
          { label: 'Land', path: 'lands', icon: Landmark },
          { label: 'Crop', path: 'crops', icon: FileText },
          { label: 'Structure', path: 'infrastructures', icon: Database },
          { label: 'Tree', path: 'trees', icon: LayoutDashboard },
          { label: 'Tenant', path: 'tenants', icon: UsersRound },
          { label: 'Business', path: 'businesses', icon: Wallet },
          { label: 'Wage Labour', path: 'workers', icon: UserRound },
          { label: 'GPS Location', path: 'gps', icon: LayoutDashboard },
        ],
      },
      { label: 'EP', path: '/ep-files', icon: UserRound },
      { label: 'EC', path: '/ec', icon: FileText },
      { label: 'Voucher', path: '/vouchers', icon: CreditCard },
      { label: 'Payment', path: '/payments', icon: Landmark },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'All Reports', path: '/reports', icon: ChartSpline },
    ],
  },
  {
    title: 'Map',
    items: [
      { label: "EP's GPS Location", path: '/ep-gps', icon: MapPin },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Users', path: '/admin/users', icon: UsersRound, adminOnly: true },
      { label: 'Roles', path: '/admin/roles', icon: ShieldCheck, adminOnly: true },
      { label: 'EP ID Codes', path: '/admin/ep-id-codes', icon: BadgeCheck },
      { label: 'Rate File', path: '/admin/rates', icon: Database, adminOnly: true },
      { label: 'Grant & Assistance', path: '/admin/grant-assistance', icon: Wallet, adminOnly: true },
      { label: 'EP Data Import', path: '/admin/ep-import-table', icon: Database, adminOnly: true },
    ],
  },
];

export function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { project, isLoading: projectLoading } = useProject();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Wait for project loading to complete before checking project
  if (projectLoading) {
    return (
      <div className="mis-theme">
        <div className="app">
          <main className="main">
            <div className="container flex min-h-[60vh] items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">Loading project...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Project selection screen renders standalone (no app shell yet).
  if (location.pathname === '/projects') {
    return <Outlet />;
  }

  // Require a selected project before showing the app shell.
  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  function isActive(path: string): boolean {
    const context = new URLSearchParams(location.search).get('context');
    // When arriving at an EP voucher page from the Payment Register,
    // highlight "Payment" instead of "Entry" in the sidebar.
    if (context === 'payment') {
      if (path === '/payments') return true;
      if (path === '/ep') return false;
    }
    if (path === '/') return location.pathname === '/';
    // Exact page match, or a real sub-page (e.g. /ep/123, /reports/slug).
    // This avoids sibling paths sharing a prefix (e.g. /ep-gps, /epicad)
    // also lighting up the "Entry" (/ep) item.
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  const isAdminRole = user?.roles?.includes('ADMIN') ?? false;

  const visibleNavGroups = MIS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || isAdminRole),
  })).filter((group) => group.items.length > 0);

  return (
    <div className={`mis-theme ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="brand">
            <Database size={20} strokeWidth={2} />
            <span className="brand-name">MIS</span>
            <button
              type="button"
              className="collapse"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          </div>

          {/* Selected project */}
          {project && (
            <div className="project">
              <div className="eyebrow">Active Project</div>
              <strong title={project.name}>{project.name}</strong>
              <div className="code">{project.project_code}</div>
              <Link to="/projects" className="switch">Switch project</Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="nav">
            {visibleNavGroups.map((group, groupIndex) => (
              <div
                key={group.title}
                className={groupIndex > 0 ? 'nav-section' : 'nav-section'}
              >
                <div className="nav-title">{group.title}</div>
                {group.items.map((item) => {
                  const children = item.children ?? [];
                  const hasChildren = children.length > 0;
                  const Icon = item.icon;

                  if (!hasChildren) {
                    return (
                      <Link
                        key={`${group.title}-${item.path}`}
                        to={item.path}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <span className="ico"><Icon size={18} strokeWidth={1.8} /></span>
                        <span className="lbl">{item.label}</span>
                      </Link>
                    );
                  }

                  const anyChildActive = children.some((child) =>
                    isActive(`${item.path}/${child.path}`),
                  );
                  const expanded = expandedGroups[item.label] ?? anyChildActive;

                  return (
                    <Fragment key={`${group.title}-${item.path}`}>
                      <button
                        type="button"
                        className={`nav-item ${anyChildActive ? 'active' : ''}`}
                        onClick={() =>
                          setExpandedGroups((prev) => ({ ...prev, [item.label]: !expanded }))
                        }
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <span className="ico"><Icon size={18} strokeWidth={1.8} /></span>
                        <span className="lbl">{item.label}</span>
                        <span className="chev">{expanded ? '▾' : '▸'}</span>
                      </button>

                      {expanded && !sidebarCollapsed && (
                        <div className="nav-sublist">
                          {children
                            .filter((child) => !child.adminOnly || isAdminRole)
                            .map((child) => {
                              const childPath = `${item.path}/${child.path}`;
                              return (
                                <Link
                                  key={child.path}
                                  to={childPath}
                                  className={`nav-subitem ${isActive(childPath) ? 'active' : ''}`}
                                >
                                  <span className="sub-dot" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User info */}
          {user && (
            <div className="sidebar-footer">
              <div className="user">
                <strong>{user.full_name}</strong>
                <span className="handle">@{user.username}</span>
              </div>
              <button className="logout" onClick={() => void logout()}>
                <LogOut size={13} strokeWidth={2.2} />
                Logout
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="main">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}