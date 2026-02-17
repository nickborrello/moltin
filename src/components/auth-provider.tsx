'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthUser {
  id: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, options?: { name?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refresh = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.authenticated && data.agent) {
        setState({
          user: {
            id: data.agent.id,
            name: data.agent.name,
          },
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (token: string, options?: { name?: string }) => {
    const headers: Record<string, string> = {
      'x-moltbook-identity': token,
    };

    if (options?.name) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: options?.name ? JSON.stringify({ name: options.name }) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    setState({
      user: {
        id: data.agent.id,
        name: data.agent.name,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
