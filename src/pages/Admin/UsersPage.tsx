// ═══════════════════════════════════════════════════════════════
// UsersPage — Admin → Users
// List / create / edit user accounts. Role assignment is handled on
// the Roles page (Admin → Roles).
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
  type CreateUserInput,
  type CreateUserResult,
  type UpdateUserInput,
} from '../../api/users';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';

interface FormState {
  full_name: string;
  designation: string;
  email: string;
  username: string;
  mobile: string;
  password: string;
  password_confirmation: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  full_name: '',
  designation: '',
  email: '',
  username: '',
  mobile: '',
  password: '',
  password_confirmation: '',
  is_active: true,
};

function errorMessage(err: unknown): string {
  const e = err as { message?: string; errors?: Record<string, string[]> };
  if (e?.errors) {
    const fields = Object.entries(e.errors)
      .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
      .join(' · ');
    if (fields) return fields;
  }
  return e?.message ?? 'Request failed';
}

export function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ editing: AdminUser | null } | null>(null);

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchUsers({ per_page: 500 }),
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (u: AdminUser) => updateUser(u.user_id, { is_active: !u.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (u: AdminUser) => deleteUser(u.user_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => window.alert(errorMessage(err)),
  });

  const users = usersQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.designation, u.username, u.email, u.mobile]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, search]);

  if (usersQuery.isLoading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  if (usersQuery.error) {
    return (
      <ErrorDisplay
        title="Failed to load users"
        message={errorMessage(usersQuery.error)}
        onRetry={() => void usersQuery.refetch()}
      />
    );
  }

  return (
    <PageLayout
      title="Users"
      subtitle="Create and manage user accounts. Assign roles from the Roles page."
      actions={
        <button
          type="button"
          onClick={() => setModal({ editing: null })}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <span className="text-base leading-none">＋</span> Add User
        </button>
      }
    >
      {!isAdmin && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This page is available only to users with the <strong>ADMIN</strong> role.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, designation, username, email or mobile…"
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Designation</th>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Mobile</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  {search ? 'No users match your search.' : 'No users yet. Add the first user.'}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                    {u.full_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {u.designation || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{u.username}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{u.mobile || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.roles.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className="inline-flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r.role_id}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                          >
                            {r.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(u)}
                      disabled={toggleMutation.isPending}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      title={u.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setModal({ editing: u })}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete user "${u.full_name}" (${u.username})? This cannot be undone.`,
                          )
                        ) {
                          removeMutation.mutate(u);
                        }
                      }}
                      disabled={removeMutation.isPending || u.user_id === user?.user_id}
                      title={
                        u.user_id === user?.user_id
                          ? 'You cannot delete your own account'
                          : 'Delete user'
                      }
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserModal
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </PageLayout>
  );
}

// ── Add / edit user modal ──────────────────────────────────────
function UserModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          full_name: editing.full_name,
          designation: editing.designation ?? '',
          email: editing.email ?? '',
          username: editing.username,
          mobile: editing.mobile ?? '',
          password: '',
          password_confirmation: '',
          is_active: editing.is_active,
        }
      : EMPTY_FORM,
  );
  const [error, setError] = useState('');

  const mutation = useMutation<CreateUserResult | AdminUser, unknown, void>({
    mutationFn: () => {
      if (editing) {
        const payload: UpdateUserInput = {
          full_name: form.full_name.trim(),
          designation: form.designation.trim() || null,
          email: form.email.trim() || null,
          mobile: form.mobile.trim() || null,
          is_active: form.is_active,
        };
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        return updateUser(editing.user_id, payload);
      }

      const payload: CreateUserInput = {
        full_name: form.full_name.trim(),
        designation: form.designation.trim() || null,
        email: form.email.trim() || null,
        username: form.username.trim(),
        is_active: form.is_active,
      };
      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }
      return createUser(payload);
    },
    onSuccess: (result) => {
      if (result && 'temp_password' in result && result.temp_password) {
        window.alert(
          `User created.\n\nTemporary password: ${result.temp_password}\n\n` +
            'The user must change it on first login.',
        );
      }
      onSaved();
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!editing && form.password && form.password !== form.password_confirmation) {
      setError('Password and confirmation do not match.');
      return;
    }
    if (form.password && form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    mutation.mutate();
  }

  const inputClass =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit User' : 'Add User'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Rahim Uddin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Entry Operator"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                placeholder="e.g. rahim"
                maxLength={50}
                required
                disabled={Boolean(editing)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
                placeholder="name@example.com"
                maxLength={150}
              />
            </div>
          </div>

          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                className={inputClass}
                placeholder="e.g. 01712345678"
                maxLength={15}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password {!editing && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className={inputClass}
                placeholder={editing ? 'Leave blank to keep current' : 'Minimum 12 characters'}
                autoComplete="new-password"
                required={!editing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password_confirmation: e.target.value }))
                }
                className={inputClass}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required={!editing}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            At least 12 characters with upper &amp; lower case, a number and a symbol.
          </p>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Active
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
