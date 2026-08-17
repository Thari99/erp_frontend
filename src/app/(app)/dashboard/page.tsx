'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppShell } from '@/lib/app-shell';

export default function DashboardPage() {
  const { user, modules, isLoading, reload } = useAppShell();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function toggleModule(moduleKey: string, next: boolean) {
    setPendingKey(moduleKey);
    try {
      const { api } = await import('@/lib/api');
      await api.setModuleEnabled(moduleKey, next);
      await reload();
    } finally {
      setPendingKey(null);
    }
  }

  async function requestModule(moduleKey: string) {
    setPendingKey(moduleKey);
    try {
      const { api } = await import('@/lib/api');
      await api.requestModule(moduleKey);
      await reload();
    } finally {
      setPendingKey(null);
    }
  }

  if (isLoading || !user) {
    return <main className="flex min-h-screen items-center justify-center text-slate-400">Loading…</main>;
  }

  // Licensing/requesting modules is an admin action (backed by `modules.manage` on every
  // relevant endpoint) — a staff member without it has nothing to do with this list, and
  // showing every module the club has licensed (most of which they can't touch) is exactly
  // the confusing "why do I see modules I have no access to" behavior this avoids.
  const canManageModules = user.isVendorRole || user.permissions.includes('modules.manage');

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-400">Signed in as {user.username}</p>
            <h1 className="text-2xl font-semibold">{user.roleName}</h1>
          </div>
          {user.isVendorRole && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/vendor/clubs"
                className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              >
                Registered clubs
              </Link>
              <Link
                href="/vendor/module-requests"
                className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              >
                Pending module requests
              </Link>
            </div>
          )}
        </header>

        {canManageModules ? (
          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">
              {user.isVendorRole ? 'Connect modules for this deployment' : 'Modules'}
            </h2>

            <ul className="divide-y divide-slate-800">
              {modules.map((module) => (
                <li key={module.moduleKey} className="flex items-center justify-between py-3">
                  <span className="text-slate-200">{module.displayName}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        module.isEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {module.isEnabled ? 'Enabled' : 'Not licensed'}
                    </span>
                    {user.isVendorRole && (
                      <button
                        onClick={() => toggleModule(module.moduleKey, !module.isEnabled)}
                        disabled={pendingKey === module.moduleKey}
                        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                      >
                        {module.isEnabled ? 'Turn off' : 'Turn on'}
                      </button>
                    )}
                    {!user.isVendorRole && !module.isEnabled && (
                      module.hasPendingRequest ? (
                        <span className="rounded bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Pending approval
                        </span>
                      ) : (
                        <button
                          onClick={() => requestModule(module.moduleKey)}
                          disabled={pendingKey === module.moduleKey}
                          className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                        >
                          {pendingKey === module.moduleKey ? 'Requesting…' : 'Request this module'}
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {!user.isVendorRole && modules.every((m) => !m.isEnabled) && (
              <p className="mt-4 text-sm text-slate-500">No business modules are licensed for this deployment yet.</p>
            )}

            {modules.some((m) => m.isEnabled) && (
              <p className="mt-4 text-sm text-slate-500">Licensed modules appear in the sidebar on the left.</p>
            )}
          </section>
        ) : (
          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Whatever you have access to appears in the sidebar on the left.</p>
          </section>
        )}
      </div>
    </main>
  );
}
