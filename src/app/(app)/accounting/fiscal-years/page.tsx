'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type FiscalYear } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function ManageFiscalYearsPage() {
  const requireLogin = useRequireLogin();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setFiscalYears(await api.listFiscalYears());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load fiscal years');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClose(fiscalYear: FiscalYear) {
    if (
      !window.confirm(
        `Close "${fiscalYear.label}"? This posts a closing entry moving net income into Retained Earnings and permanently locks this period against new postings.`,
      )
    )
      return;
    setBusyId(fiscalYear.id);
    setError(null);
    try {
      await api.closeFiscalYear(fiscalYear.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to close fiscal year');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(fiscalYear: FiscalYear) {
    if (!window.confirm(`Delete "${fiscalYear.label}"?`)) return;
    setBusyId(fiscalYear.id);
    setError(null);
    try {
      await api.deleteFiscalYear(fiscalYear.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete fiscal year');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Accounting · Fiscal Years</p>
            <h1 className="text-2xl font-semibold">Manage Fiscal Years</h1>
          </div>
          <Link
            href="/accounting/fiscal-years/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Fiscal Year
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Start Date</th>
                <th className="px-4 py-3 font-medium">End Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : fiscalYears.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No fiscal years yet —{' '}
                    <Link href="/accounting/fiscal-years/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                fiscalYears.map((fy) => (
                  <tr key={fy.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    <td className="px-4 py-3">{fy.label}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(fy.startDate)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(fy.endDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                          fy.isClosed ? 'text-slate-500' : 'text-emerald-400'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${fy.isClosed ? 'bg-slate-600' : 'bg-emerald-500'}`} />
                        {fy.isClosed ? `Closed by ${fy.closedBy}` : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!fy.isClosed && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleClose(fy)}
                            disabled={busyId === fy.id}
                            className="rounded border border-amber-800 px-2 py-1 text-xs text-amber-400 hover:border-amber-500 disabled:opacity-50"
                          >
                            Close Year
                          </button>
                          <button
                            onClick={() => handleDelete(fy)}
                            disabled={busyId === fy.id}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
