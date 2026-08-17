'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type Role } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function EditRolePage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const detail = await api.getRole(params.id);
      setRole(detail);
      setName(detail.name);
      setDescription(detail.description ?? '');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load role');
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
    setSuccess(false);
    setIsSaving(true);
    try {
      const updated = await api.updateRole(params.id, { name, description });
      setRole(updated);
      setSuccess(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Administration · Roles</p>
            <h1 className="text-2xl font-semibold">Edit Role</h1>
          </div>
          <button onClick={() => router.push('/admin/roles')} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to Roles
          </button>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Role saved.</p>}

        {isLoading || !role ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Role Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                minLength={2}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <Link href={`/admin/roles/${role.id}/permissions`} className="text-sm text-emerald-400 hover:underline">
                Edit permissions →
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
