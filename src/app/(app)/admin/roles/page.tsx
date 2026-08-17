'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type Role } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageRolesPage() {
  const requireLogin = useRequireLogin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRoles(await api.listRoles());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(role: Role) {
    if (role._count.users > 0) {
      setError(`Cannot delete "${role.name}" — ${role._count.users} user(s) still hold this role. Reassign them first.`);
      return;
    }
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    setBusyId(role.id);
    setError(null);
    try {
      await api.deleteRole(role.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete role');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Administration · Roles</p>
            <h1 className="text-2xl font-semibold">Manage Roles</h1>
          </div>
          <Link href="/admin/roles/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Create Role
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Roles ({roles.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium">Permissions</th>
                    <th className="px-2 py-2 font-medium">Users</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-2 font-medium">{role.name}</td>
                      <td className="px-2 py-2 text-slate-400">{role.description ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{role.permissions.length}</td>
                      <td className="px-2 py-2 text-slate-400">{role._count.users}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/roles/${role.id}/edit`} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                            Edit
                          </Link>
                          <Link
                            href={`/admin/roles/${role.id}/permissions`}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            Permissions
                          </Link>
                          <button
                            onClick={() => handleDelete(role)}
                            disabled={busyId === role.id}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
