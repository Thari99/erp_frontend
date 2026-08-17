'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateFiscalYearPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await api.createFiscalYear({ label: label.trim(), startDate, endDate });
      router.push('/accounting/fiscal-years');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create fiscal year');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Fiscal Years</p>
          <h1 className="text-2xl font-semibold">Create Fiscal Year</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              placeholder="e.g. 2025/2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create Fiscal Year'}
          </button>
        </form>
      </div>
    </main>
  );
}
