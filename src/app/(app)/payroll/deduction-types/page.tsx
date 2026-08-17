'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PayrollDeductionType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageDeductionTypePage() {
  const requireLogin = useRequireLogin();
  const [types, setTypes] = useState<PayrollDeductionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTypes(await api.listPayrollDeductionTypes());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load deduction types');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(type: PayrollDeductionType) {
    setBusyId(type.id);
    setError(null);
    try {
      await api.updatePayrollDeductionType(type.id, { isActive: !type.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update deduction type');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(type: PayrollDeductionType) {
    if (!window.confirm(`Delete "${type.name}"?`)) return;
    setBusyId(type.id);
    setError(null);
    try {
      await api.deletePayrollDeductionType(type.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete deduction type');
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
            <h1 className="text-2xl font-semibold">Manage Deduction Type</h1>
          </div>
          <Link
            href="/payroll/deduction-types/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Deduction Type
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Deduction</th>
                <th className="px-4 py-3 font-medium">Default Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No deduction types yet —{' '}
                    <Link href="/payroll/deduction-types/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                types.map((type) => (
                  <tr key={type.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    <td className="px-4 py-3">{type.name}</td>
                    <td className="px-4 py-3">Rs. {Number(type.defaultAmount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                          type.isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${type.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(type)}
                          disabled={busyId === type.id}
                          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                        >
                          {type.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          disabled={busyId === type.id}
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
