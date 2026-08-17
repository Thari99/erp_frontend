'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type TrialBalanceReport } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function TrialBalancePage() {
  const requireLogin = useRequireLogin();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await api.getTrialBalance(from ? `${from}T00:00:00` : undefined, to ? `${to}T23:59:59` : undefined));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Reports</p>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div>
            <p className="mb-1 text-xs text-slate-400">From (optional)</p>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">To</p>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !report ? null : (
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Debit</th>
                  <th className="px-4 py-3 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {report.accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No activity in this range.
                    </td>
                  </tr>
                ) : (
                  report.accounts.map((account) => (
                    <tr key={account.code} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{account.code}</td>
                      <td className="px-4 py-3">{account.name}</td>
                      <td className="px-4 py-3 text-slate-400">{account.type}</td>
                      <td className="px-4 py-3 text-right">{account.debitBalance > 0 ? account.debitBalance.toFixed(2) : ''}</td>
                      <td className="px-4 py-3 text-right">{account.creditBalance > 0 ? account.creditBalance.toFixed(2) : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 font-medium text-slate-100">
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">{report.totalDebit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{report.totalCredit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className={`border-t border-slate-800 px-4 py-3 text-sm ${report.isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
              {report.isBalanced ? '✓ Balanced' : '✗ Not balanced'}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
