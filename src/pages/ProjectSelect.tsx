// ═══════════════════════════════════════════════════════════════
// ProjectSelect — post-login project picker
// Shows the list of projects to work on. Admin users can add a new
// project directly from this screen.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, createProject, deleteProject, type Project, type ProjectCreateInput } from '../api/projects';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';

export function ProjectSelect() {
  const { user, logout } = useAuth();
  const { selectProject } = useProject();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60_000,
  });

  function handleSelect(project: Project) {
    selectProject(project);
    navigate('/');
  }

  const deleteMutation = useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: () => {
      setDeleteError('');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete project');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MIS — Inventory of Loss Survey</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome, <span className="font-medium text-gray-700">{user?.full_name}</span> — select a project to work on
          </p>
        </div>

        {/* Add Project (admin only) */}
        {isAdmin && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <span className="text-base">＋</span> Add Project
            </button>
          </div>
        )}

        {/* Project list */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Projects
            </h2>
          </div>

          {isLoading && (
            <div className="p-8">
              <LoadingSpinner message="Loading projects..." />
            </div>
          )}

          {error && (
            <div className="p-4">
              <ErrorDisplay
                message={error instanceof Error ? error.message : 'Failed to load projects'}
                onRetry={() => refetch()}
              />
            </div>
          )}

          {!isLoading && !error && projects && projects.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              No projects found.
              {isAdmin && ' Use "Add Project" to create one.'}
            </div>
          )}

          {!isLoading && !error && projects && projects.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {projects.map((project) => (
                <li key={project.project_id}>
                  <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-blue-50">
                    <button
                      onClick={() => handleSelect(project)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg">
                      📁
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {project.name}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {project.project_code}
                        {project.description ? ` — ${project.description}` : ''}
                      </span>
                    </span>
                      <span className="text-sm font-medium text-blue-600">Select →</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(project.project_id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {deleteError && <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{deleteError}</div>}
        </div>

        {/* Logout */}
        <div className="mt-6 text-center">
          <button
            onClick={() => void logout()}
            className="text-xs text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onCreated={(project) => {
            setShowAdd(false);
            handleSelect(project);
          }}
        />
      )}
    </div>
  );
}

// ── Add Project modal ─────────────────────────────────────────
function AddProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProjectCreateInput>({
    project_code: '',
    name: '',
    phase: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: true,
    remarks: '',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => createProject(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onCreated(project);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    },
  });

  function setField(name: keyof ProjectCreateInput, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      remarks: form.remarks || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Project</h3>
          <button
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
              Project Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.project_code}
              onChange={(e) => setField('project_code', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. PRJ-2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Cyclone Recovery Project"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phase</label>
            <input
              type="text"
              value={form.phase ?? ''}
              onChange={(e) => setField('phase', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Phase A — used in the EP ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={form.start_date ?? ''}
                onChange={(e) => setField('start_date', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => setField('end_date', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <input
              type="text"
              value={form.remarks ?? ''}
              onChange={(e) => setField('remarks', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

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
              disabled={createMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}