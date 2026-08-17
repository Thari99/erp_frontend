'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateRolePage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const role = await api.createRole({ name, description: description || undefined });
      router.push(`/admin/roles/${role.id}/permissions`);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create role');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Administration · Roles</p>
          <h1 className="text-2xl font-semibold">Create Role</h1>
          <p className="mt-1 text-sm text-slate-500">After creating the role you&apos;ll be taken straight to its permission matrix.</p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Role Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              placeholder="e.g. Front Office, Accountant"
              minLength={2}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create Role'}
          </button>
        </form>
      </div>
    </main>
  );
}
