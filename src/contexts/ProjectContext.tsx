// ═══════════════════════════════════════════════════════════════
// ProjectContext — global active project selection
// Persists the selected project in localStorage so it carries
// across all admin pages (EP ID Codes, Rate File, Grant, etc.)
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { fetchProjects, type Project } from '../api/projects';

interface ProjectContextValue {
  project: Project | null;
  projects: Project[];
  selectProject: (project: Project | null) => void;
  isLoading: boolean;
}

const STORAGE_KEY = 'mis_active_project_id';

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects on mount
  useEffect(() => {
    fetchProjects()
      .then((data) => {
        setProjects(data);
        // Try to restore active project from localStorage
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
          const storedProject = data.find((p) => p.project_id === Number(storedId));
          if (storedProject) {
            setProjectState(storedProject);
          }
        }
        // Fallback: auto-select first active project if none stored
        if (!project && data.length > 0) {
          const firstActive = data.find((p) => p.is_active) ?? data[0];
          if (firstActive) {
            setProjectState(firstActive);
            localStorage.setItem(STORAGE_KEY, String(firstActive.project_id));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load projects:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const selectProject = useCallback((p: Project | null) => {
    setProjectState(p);
    if (p) {
      localStorage.setItem(STORAGE_KEY, String(p.project_id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        project,
        projects,
        selectProject,
        isLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}