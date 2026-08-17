'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollSettings } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function PayrollSettingsPage() {
  const requireLogin = useRequireLogin();
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [epfEmployeeRate, setEpfEmployeeRate] = useState('');
  const [epfEmployerRate, setEpfEmployerRate] = useState('');
  const [etfRate, setEtfRate] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getPayrollSettings();
      setSettings(data);
      setEpfEmployeeRate(data.epfEmployeeRate);
      setEpfEmployerRate(data.epfEmployerRate);
      setEtfRate(data.etfRate);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load payroll settings');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const saved = await api.updatePayrollSettings({
        epfEmployeeRate: Number(epfEmployeeRate),
        epfEmployerRate: Number(epfEmployerRate),
        etfRate: Number(etfRate),
      });
      setSettings(saved);
      setSuccess(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save payroll settings');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Settings</p>
          <h1 className="text-2xl font-semibold">EPF / ETF Rates</h1>
          <p className="mt-1 text-sm text-slate-500">
            These rates apply to every salary calculated from now on. Past salary runs keep the rates they were calculated with.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Rates saved.</p>}

        {isLoading || !settings ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">EPF — Employee Rate (%)</label>
              <input
                type="number"
                value={epfEmployeeRate}
                onChange={(e) => setEpfEmployeeRate(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                max={100}
                step="0.01"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Deducted from the employee&apos;s net pay. Sri Lanka statutory default: 8%.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">EPF — Employer Rate (%)</label>
              <input
                type="number"
                value={epfEmployerRate}
                onChange={(e) => setEpfEmployerRate(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                max={100}
                step="0.01"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Employer cost only — never deducted from the employee. Statutory default: 12%.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">ETF Rate (%)</label>
              <input
                type="number"
                value={etfRate}
                onChange={(e) => setEtfRate(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                max={100}
                step="0.01"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Employer cost only — never deducted from the employee. Statutory default: 3%.</p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Rates'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
