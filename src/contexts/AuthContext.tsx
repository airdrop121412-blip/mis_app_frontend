// ═══════════════════════════════════════════════════════════════
// AuthContext — shared auth state across the entire component tree
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, fetchCurrentUser } from '../api/reports';
import type { LoginRequest } from '../types/api';

interface User {
  user_id: number;
  full_name: string;
  username: string;
  is_active: boolean;
  roles?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!localStorage.getItem('auth_token'),
    isLoading: true,
  });

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    fetchCurrentUser()
      .then((user) => {
        setState({ user, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await apiLogin(credentials);
    localStorage.setItem('auth_token', result.token);
    setState({
      user: result.user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem('auth_token');
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
