'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type Role, type StaffUser } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function EditUserPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [roleId, setRoleId] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const [detail, roleList] = await Promise.all([api.getUser(params.id), api.listRoles()]);
      setUser(detail);
      setRoles(roleList);
      setFullName(detail.fullName);
      setEmail(detail.email);
      setUsername(detail.username);
      setRoleId(detail.roleId);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!params.id) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const updated = await api.updateUser(params.id, { fullName, email, username, roleId });
      setUser(updated);
      setSuccess('User details saved.');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!params.id || !newPassword) return;
    setError(null);
    setSuccess(null);
    setIsResetting(true);
    try {
      await api.resetUserPassword(params.id, newPassword);
      setNewPassword('');
      setSuccess('Password reset.');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Administration · Users</p>
            <h1 className="text-2xl font-semibold">Edit User</h1>
          </div>
          <button onClick={() => router.push('/admin/users')} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to Users
          </button>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">{success}</p>}

        {isLoading || !user ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
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
                <label className="mb-1 block text-xs text-slate-400">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                >
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
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>

            <form onSubmit={handleResetPassword} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Reset Password</h2>
              <div>
                <label className="mb-1 block text-xs text-slate-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
              <button
                type="submit"
                disabled={isResetting || newPassword.length < 8}
                className="rounded border border-amber-700 px-4 py-2 text-sm font-medium text-amber-400 hover:border-amber-500 disabled:opacity-50"
              >
                {isResetting ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
