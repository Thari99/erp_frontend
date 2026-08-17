'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type CurrentUser, type ModuleEntry } from './api';

interface AppShellState {
  user: CurrentUser | null;
  modules: ModuleEntry[];
  isLoading: boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  reload: () => Promise<void>;
}

const AppShellContext = createContext<AppShellState | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [modules, setModules] = useState<ModuleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [me, moduleList] = await Promise.all([api.me(), api.modules()]);
      setUser(me);
      setModules(moduleList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isModuleEnabled = useCallback(
    (moduleKey: string) => modules.some((m) => m.moduleKey === moduleKey && m.isEnabled),
    [modules],
  );

  return (
    <AppShellContext.Provider value={{ user, modules, isLoading, isModuleEnabled, reload }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return ctx;
}
