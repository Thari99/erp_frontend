'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateCategoryPage() {
  const requireLogin = useRequireLogin();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await api.createBarCategory({ name, isActive: status === 'ACTIVE' });
      setName('');
      setStatus('ACTIVE');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add category');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Bar · Category</p>
          <h1 className="text-2xl font-semibold">Create Category</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Category added.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Category Name</label>
            <input
              placeholder="e.g. Whisky"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Adding…' : 'Add category'}
          </button>
        </form>
      </div>
    </main>
  );
}
