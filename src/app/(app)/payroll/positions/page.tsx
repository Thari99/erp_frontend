'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PayrollJobPosition } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageJobPositionPage() {
  const requireLogin = useRequireLogin();
  const [positions, setPositions] = useState<PayrollJobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPositions(await api.listPayrollJobPositions());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load job positions');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(position: PayrollJobPosition) {
    setBusyId(position.id);
    setError(null);
    try {
      await api.updatePayrollJobPosition(position.id, { isActive: !position.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update job position');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(position: PayrollJobPosition) {
    if (!window.confirm(`Delete "${position.name}"?`)) return;
    setBusyId(position.id);
    setError(null);
    try {
      await api.deletePayrollJobPosition(position.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete job position');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Payroll · Setup</p>
            <h1 className="text-2xl font-semibold">Manage Job Position</h1>
          </div>
          <Link
            href="/payroll/positions/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Job Position
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Basic / Day</th>
                <th className="px-4 py-3 font-medium">OT / Hour</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No job positions yet —{' '}
                    <Link href="/payroll/positions/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                positions.map((position) => (
                  <tr key={position.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    <td className="px-4 py-3">{position.name}</td>
                    <td className="px-4 py-3 text-slate-400">{position.department?.name ?? '—'}</td>
                    <td className="px-4 py-3">Rs. {Number(position.basicPerDay).toFixed(2)}</td>
                    <td className="px-4 py-3">Rs. {Number(position.otPerHour).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                          position.isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${position.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        {position.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(position)}
                          disabled={busyId === position.id}
                          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                        >
                          {position.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(position)}
                          disabled={busyId === position.id}
                          className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
