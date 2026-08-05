import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '../../api/admin.js';

interface AdminAuthValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  administratorEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

const SESSION_QUERY_KEY = ['admin', 'session'];

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await adminApi.fetchSession();
      } catch {
        return { authenticated: false };
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      adminApi.login(email, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => adminApi.logout(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  const value = useMemo<AdminAuthValue>(
    () => ({
      isLoading: sessionQuery.isLoading,
      isAuthenticated: sessionQuery.data?.authenticated ?? false,
      administratorEmail: sessionQuery.data?.administrator?.email ?? null,
      login: async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      loginError: loginMutation.error instanceof Error ? loginMutation.error.message : null,
      isLoggingIn: loginMutation.isPending,
    }),
    [sessionQuery.isLoading, sessionQuery.data, loginMutation, logoutMutation],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth muss innerhalb von AdminAuthProvider verwendet werden.');
  }
  return context;
}
