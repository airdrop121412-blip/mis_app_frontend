// ═══════════════════════════════════════════════════════════════
// Dashboard — MIS landing page with aggregate statistics
// Phase 4B-9: Rebuilt from report-only to full MIS dashboard
// Phase 4C-2: Redesigned to "MIS Dashboard Premium" format — KPI
//             cards, workflow progress, status + pending actions,
//             data quality, live-searchable recent EP records.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  UserRound, BadgeCheck, FileCheck2, TicketCheck, Landmark, Wallet,
  FilePenLine, TrendingUp, ArrowUpRight, FileText,
} from 'lucide-react';
import { fetchDashboardStats } from '../api/dashboard';
import { listEps } from '../api/ep';
import { useProject } from '../contexts/ProjectContext';
import { useDeleteDraftEps } from '../hooks/useEp';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, formatInteger } from '../utils/format';
import type { DashboardStats } from '../types/dashboard';
import type { AffectedPerson } from '../types/ep';

export function Dashboard() {
  const { project } = useProject();
  const [query, setQuery] = useState('');

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats', project?.project_id],
    queryFn: () => fetchDashboardStats(project?.project_id),
    staleTime: 30_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['dashboard-recent-eps', project?.project_id],
    queryFn: () => listEps({ project_id: project?.project_id, per_page: 6 }),
    staleTime: 30_000,
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Inventory of Loss Survey &amp; Compensation Management System</p>
        </div>
        <div className="top-actions">
          <input
            className="search"
            type="search"
            placeholder="Search EP records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Link to="/reports" className="primary">
            <TrendingUp size={16} strokeWidth={1.9} />
            Reports
          </Link>
        </div>
      </div>

      <div className="rule" />

      {project && (
        <div className="project-bar">
          <div className="truncate">
            <strong className="truncate">{project.name}</strong>{' '}
            <span className="meta">({project.project_code})</span> — live overview
          </div>
          <Link to="/projects" className="switch">Switch Project</Link>
        </div>
      )}

      {isLoading && <LoadingSpinner message="Loading dashboard..." />}

      {error && (
        <ErrorDisplay
          message={error instanceof Error ? error.message : 'Failed to load dashboard'}
          onRetry={() => refetch()}
        />
      )}

      {stats && (
        <DashboardContent
          stats={stats}
          recent={recent?.items ?? []}
          query={query}
        />
      )}
    </div>
  );
}

// ── Card builders ─────────────────────────────────────────────

function DashboardContent({
  stats,
  recent,
  query,
}: {
  stats: DashboardStats;
  recent: AffectedPerson[];
  query: string;
}) {
        const approvedEcs = stats.ec.by_status.APPROVED ?? 0;
  const deleteDrafts = useDeleteDraftEps();
  const { project } = useProject();

    const kpis = [
    { label: 'Total EPs', value: formatInteger(stats.ep.total), meta: `${stats.validation.invalid_eps} cannot generate EP ID — see warning`, to: '/ep', icon: UserRound },
    { label: 'Valid EPs', value: formatInteger(stats.validation.valid_eps), meta: `${stats.validation.invalid_eps} EP ID issues — see warning`, to: '/ep/invalid', icon: BadgeCheck },
    { label: 'Approved ECs', value: formatInteger(approvedEcs), meta: `${formatInteger(stats.ec.total ?? 0)} total ECs`, to: '/ec', icon: FileCheck2 },
    { label: 'Vouchers', value: formatInteger(stats.voucher.total), meta: `${formatMoney(stats.voucher.total_amount)} in file`, to: '/vouchers', icon: TicketCheck },
    { label: 'Payments', value: formatInteger(stats.payment.total_count), meta: 'vouchers paid', to: '/payments', icon: Landmark },
    { label: 'Total Paid', value: formatMoney(stats.payment.total_paid), meta: 'disbursed so far', to: '/payments', icon: Wallet },
  ];

  const workflow = [
    { label: 'Entry', icon: FilePenLine, count: stats.ep.total },
    { label: 'EP', icon: UserRound, count: stats.ep.by_status.APPROVED ?? 0 },
    { label: 'Validation', icon: BadgeCheck, count: stats.validation.valid_eps },
    { label: 'EC', icon: FileCheck2, count: stats.ec.total },
    { label: 'Voucher', icon: TicketCheck, count: stats.voucher.total },
    { label: 'Payment', icon: Landmark, count: stats.payment.total_count },
  ];

  const statusOrder = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED'];
  const epStatusRows = statusOrder
    .map((s) => ({ status: s, count: stats.ep.by_status[s] ?? 0 }))
    .filter((r) => r.count > 0);

    const pendingActions = [
      { label: 'Draft EPs', count: stats.ep.by_status.DRAFT ?? 0, to: '/ep' },
      { label: 'NID Issues', count: stats.validation.invalid_eps, to: '/ep/invalid' },
      { label: 'Approved ECs', count: approvedEcs, to: '/vouchers' },
      { label: 'No Voucher Yet', count: Math.max(0, approvedEcs - stats.validation.with_voucher), to: '/vouchers' },
    ];

    const quality = [
    { label: 'Total EPs', value: stats.validation.total_eps, cls: '' },
    { label: 'Valid', value: stats.validation.valid_eps, cls: 'good', to: '/ep' },
    { label: 'Approved EC', value: stats.validation.with_approved_ec, cls: 'blue' },
  ];


  const quickLinks = [
    { label: 'EP List', to: '/ep', icon: FilePenLine },
    { label: 'Entry', to: '/ep', icon: FileText },
      { label: 'Correction', to: '/corrections', icon: BadgeCheck },
    { label: 'Reports', to: '/reports', icon: TrendingUp },
  ];

  const filteredRecent = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((ep) =>
      [ep.ep_id, ep.name, ep.mouza, ep.union_name, ep.nid_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [recent, query]);

  return (
    <div>
      {/* ── KPI cards ───────────────────────────────────────── */}
      <div className="kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} to={kpi.to} className="card kpi">
              <div className="kpi-top">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-icon"><Icon size={20} strokeWidth={1.9} /></span>
              </div>
              <div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-meta">
                  <span className="trend">{kpi.meta}</span>
                  <ArrowUpRight size={13} strokeWidth={2.2} className="text-muted" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Workflow progress ───────────────────────────────── */}
      <div className="card section">
        <div className="section-title">Workflow Progress</div>
        <div className="workflow">
          {workflow.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="step">
                <div className="step-icon"><Icon size={20} strokeWidth={1.8} /></div>
                <strong>{formatInteger(step.count)}</strong>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EP Status + Pending Actions ─────────────────────── */}
      <div className="grid2">
        <div className="card section">
          <div className="section-title">EP Status</div>
          {epStatusRows.length === 0 && <p className="text-muted">No EP records yet.</p>}
          {epStatusRows.map((row) => (
            <div key={row.status} className="status-row">
              <span className="row-label">
                <StatusBadge status={row.status} />
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold money-num">{formatInteger(row.count)}</span>
                <Link className="action" to="/ep">View</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="card section">
          <div className="section-title">Pending Actions</div>
          {pendingActions.map((action) => (
            <div key={action.label} className="status-row">
              <span className="row-label">{action.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold money-num">{formatInteger(action.count)}</span>
                <Link className="action" to={action.to}>View</Link>
              </div>
            </div>
          ))}
          <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
            {stats.compensation.total_approved} compensation records approved overall.
          </p>
        </div>
      </div>

      {/* ── Data quality ────────────────────────────────────── */}
      <div className="card section">
        <div className="section-title">Data Quality</div>
        <div className="quality">
                     {quality.map((q) => {
             const content = (
               <>
                 <strong>{formatInteger(q.value)}</strong>
                 <span>{q.label}</span>
               </>
             );
             return q.to ? (
               <Link key={q.label} to={q.to} className={`quality-box ${q.cls}`}>
                 {content}
               </Link>
             ) : (
               <div key={q.label} className={`quality-box ${q.cls}`}>
                 {content}
               </div>
             );
           })}
        </div>
      </div>

      {/* ── Data quality warning ────────────────────────────── */}
      {stats.validation.invalid_eps > 0 && (
        <div className="card section warning-banner">
          <div className="warning-text">
            <span className="warning-icon">Warning</span>
            <strong>{stats.validation.invalid_eps}</strong> EPs cannot generate EP ID (blank/invalid/duplicate NID).
            <span className="warning-sub">Total drafts in project: {stats.ep.by_status.DRAFT ?? 0}</span>
          </div>
          <div className="warning-actions">
            <Link to="/ep/invalid" className="secondary">View Issues</Link>
            <button
              className="danger"
              onClick={async () => {
                const draftCount = stats.ep.by_status.DRAFT ?? 0;
                if (window.confirm(`Delete ALL ${draftCount} draft EPs? This cannot be undone.`)) {
                  await deleteDrafts.mutateAsync(project?.project_id);
                }
              }}
              disabled={deleteDrafts.isPending}
            >
              {deleteDrafts.isPending ? 'Deleting...' : 'Delete All Draft'}
            </button>
          </div>
        </div>
      )}

      {/* ── Recent EP records ───────────────────────────────── */}
      <div className="card section">
        <div className="section-title">Recent EP Records</div>
        {recent.length === 0 ? (
          <p className="text-muted">No EP records yet. Start with the <Link className="action" to="/ep">Entry</Link> screen.</p>
        ) : (
          <>
            {query.trim() !== '' && (
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
                {formatInteger(filteredRecent.length)} record(s) match “{query.trim()}”.
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>EP ID</th>
                    <th>Name</th>
                    <th>Village</th>
                    <th>EP Status</th>
                    <th>EC Status</th>
                    <th>Compensation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.map((ep) => (
                    <tr key={ep.affected_person_id}>
                      <td><strong>{ep.ep_id ?? '—'}</strong></td>
                      <td>{ep.name}</td>
                      <td>{ep.mouza ?? '—'}</td>
                      <td><StatusBadge status={ep.status} /></td>
                      <td>{ep.ec_status ? <StatusBadge status={ep.ec_status} /> : <span className="text-muted">—</span>}</td>
                      <td className="money-num">{formatMoney(ep.dc_compensation)}</td>
                      <td>
                        <Link className="action" to={`/ep/${ep.affected_person_id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Link className="action" to="/ep">View all EP records →</Link>
            </div>
          </>
        )}
      </div>

      {/* ── Quick links ─────────────────────────────────────── */}
      <div className="card section">
        <div className="section-title">Quick Links</div>
        <div className="quick">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.label} to={q.to}>
                <span className="qico"><Icon size={20} strokeWidth={1.9} /></span>
                {q.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}