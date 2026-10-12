// ═══════════════════════════════════════════════════════════════
// RolesPage — Admin → Roles
// Shows the available roles and lets an admin set each user's role
// (Administrator / Entry Operator). One role per user.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchUsers,
  fetchRoles,
  assignUserRole,
  type AdminRole,
} from '../../api/users';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';

const PRIMARY_ROLE_ORDER = ['ADMIN', 'ENTRY_OPERATOR'];

function roleRank(role: AdminRole): number {
  const i = PRIMARY_ROLE_ORDER.indexOf(role.code);
  return i === -1 ? PRIMARY_ROLE_ORDER.length : i;
}

function errorMessage(err: unknown): string {
  const e = err as { message?: string };
  return e?.message ?? 'Request failed';
}

export function RolesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [rowError, setRowError] = useState('');

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchRoles,
    staleTime: 5 * 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchUsers({ per_page: 500 }),
    staleTime: 60_000,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      assignUserRole(userId, roleId),
    onSuccess: () => {
      setRowError('');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => setRowError(errorMessage(err)),
  });

  const roles = useMemo(() => {
    const list = [...(rolesQuery.data ?? [])];
    list.sort((a, b) => roleRank(a) - roleRank(b) || a.name.localeCompare(b.name));
    return list;
  }, [rolesQuery.data]);

  const users = usersQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.username, u.designation, u.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, search]);

  if (rolesQuery.isLoading || usersQuery.isLoading) {
    return <LoadingSpinner message="Loading roles..." />;
  }

  if (rolesQuery.error || usersQuery.error) {
    return (
      <ErrorDisplay
        title="Failed to load roles"
        message={errorMessage(rolesQuery.error ?? usersQuery.error)}
        onRetry={() => {
          void rolesQuery.refetch();
          void usersQuery.refetch();
        }}
      />
    );
  }

  return (
    <PageLayout
      title="Roles"
      subtitle="Set each user's role — Administrator (full access) or Entry Operator (data entry)."
    >
      {!isAdmin && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This page is available only to users with the <strong>ADMIN</strong> role.
        </div>
      )}

      {/* Role reference */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <section
            key={role.role_id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{role.name}</h3>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">
                {role.code}
              </code>
            </div>
            {role.description && (
              <p className="mt-1 text-xs text-gray-500">{role.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {role.permissions && role.permissions.length > 0 ? (
                role.permissions.map((p) => (
                  <span
                    key={p.permission_id}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                  >
                    {p.code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">No permissions</span>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* User role assignment */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">User Role Assignment</h2>
            <span className="text-xs text-gray-400">
              Choosing a role replaces the user's current role.
            </span>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full max-w-xs rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </header>

        {rowError && (
          <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">
            {rowError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Designation</th>
                <th className="px-5 py-3 font-semibold">Username</th>
                <th className="px-5 py-3 font-semibold">Current Role</th>
                <th className="px-5 py-3 font-semibold">Set Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    {search ? 'No users match your search.' : 'No users yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const current = u.roles[0];
                  const busy =
                    assignMutation.isPending &&
                    assignMutation.variables?.userId === u.user_id;
                  return (
                    <tr key={u.user_id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-800">
                        {u.full_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                        {u.designation || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                        {u.username}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {current ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {current.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <select
                          value={current?.role_id ?? ''}
                          disabled={busy}
                          onChange={(e) => {
                            const roleId = Number(e.target.value);
                            if (roleId) {
                              assignMutation.mutate({ userId: u.user_id, roleId });
                            }
                          }}
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        >
                          <option value="">— Not assigned —</option>
                          {roles.map((role) => (
                            <option key={role.role_id} value={role.role_id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        {busy && <span className="ml-2 text-xs text-gray-400">Saving…</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageLayout>
  );
}
