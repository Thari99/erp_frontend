'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type StaffUser } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { useAppShell } from '@/lib/app-shell';

export default function ManageUsersPage() {
  const requireLogin = useRequireLogin();
  const { user: currentUser } = useAppShell();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(user: StaffUser) {
    setBusyId(user.id);
    setError(null);
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update user');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Administration · Users</p>
            <h1 className="text-2xl font-semibold">Manage Users</h1>
          </div>
          <Link href="/admin/users/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Create User
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Staff Users ({users.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">
              No staff users yet —{' '}
              <Link href="/admin/users/new" className="text-emerald-400 underline">
                create one
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Full Name</th>
                    <th className="px-2 py-2 font-medium">Username</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Role</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <tr key={user.id} className="border-t border-slate-800">
                        <td className={`px-2 py-2 ${user.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                          {user.fullName}
                          {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                        </td>
                        <td className="px-2 py-2 text-slate-400">{user.username}</td>
                        <td className="px-2 py-2 text-slate-400">{user.email}</td>
                        <td className="px-2 py-2 text-slate-400">{user.role.name}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                              user.isActive ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 flex-none rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                            {user.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/users/${user.id}/edit`} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                              Edit
                            </Link>
                            <button
                              onClick={() => toggleStatus(user)}
                              disabled={busyId === user.id || (isSelf && user.isActive)}
                              title={isSelf && user.isActive ? "You can't deactivate your own account" : undefined}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                            >
                              {user.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
