import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { useProject } from '../contexts/ProjectContext';
import { listPaymentRegister } from '../api/payments';
import { formatMoney } from '../utils/format';

export function PaymentPage() {
  const { project } = useProject();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['payment-register', project?.project_id, search],
    queryFn: () => listPaymentRegister({ project_id: project?.project_id, q: search || undefined }),
    enabled: !!project,
  });

  return (
    <PageLayout title="Payment Register" subtitle="Fully paid EPs and their recorded disbursements">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Paid EPs</h2>
            <p className="text-xs text-gray-500">Old records are read-only. Additional payments are created from the EP record.</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="HH ID, EP ID, name, NID..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-72"
          />
        </div>
        {query.isLoading ? <LoadingSpinner message="Loading paid EPs..." /> : query.error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{query.error instanceof Error ? query.error.message : 'Failed to load payments.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {['HH ID', 'EP ID', 'Name', 'Father Name', 'NID No', 'Mobile No', 'Mouza', 'Union', 'Upazila', 'District', 'Loss Category', 'Compensation Amount', 'Status', 'Action'].map((label) => <th key={label} className="whitespace-nowrap px-3 py-3">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {(query.data ?? []).map((row) => (
                  <tr key={row.affected_person_id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-3 py-3 font-mono">{row.hh_id ?? '—'}</td>
                    <td className="px-3 py-3 font-mono">{row.ep_id ?? '—'}</td>
                    <td className="px-3 py-3 font-medium">{row.name}</td>
                    <td className="px-3 py-3">{row.father_name ?? '—'}</td>
                    <td className="px-3 py-3">{row.nid_number}</td>
                    <td className="px-3 py-3">{row.mobile}</td>
                    <td className="px-3 py-3">{row.mouza ?? '—'}</td>
                    <td className="px-3 py-3">{row.union_name ?? '—'}</td>
                    <td className="px-3 py-3">{row.upazila ?? '—'}</td>
                    <td className="px-3 py-3">{row.district ?? '—'}</td>
                    <td className="px-3 py-3">{row.category_of_loss ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatMoney(row.compensation_amount)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link className="text-blue-600 hover:underline" to={`/ep/${row.affected_person_id}/voucher?context=payment`}>
                        Add additional loss
                      </Link>
                    </td>
                  </tr>
                ))}
                {(query.data ?? []).length === 0 && <tr><td colSpan={14} className="px-3 py-10 text-center text-gray-500">No paid EPs found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
