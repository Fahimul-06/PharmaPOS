import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const result = await api.get<{ user: UserProfile }>('/api/auth/me');
      setProfile(result.user);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.post<{ user: UserProfile }>('/api/auth/login', { email, password });
      setProfile(result.user);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const signOut = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* session may already be gone */ }
    setProfile(null);
  };

  return <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
