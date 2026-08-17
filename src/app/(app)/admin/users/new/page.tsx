'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Role, type StaffUser } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateUserPage() {
  const requireLogin = useRequireLogin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<StaffUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

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

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setIsSaving(true);
    try {
      const user = await api.createUser({ fullName, email, username, password, roleId });
      setFullName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setRoleId('');
      setSaved(user);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Administration · Users</p>
          <h1 className="text-2xl font-semibold">Create Staff User</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Staff account created for <span className="font-semibold">{saved.fullName}</span>.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-slate-500">
            No roles exist yet — create one under Administration → Create Role before adding a staff user.
          </p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                minLength={3}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Creating…' : 'Create User'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
