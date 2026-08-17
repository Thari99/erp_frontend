'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ChartOfAccount, type GeneralLedgerGroup } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function GeneralLedgerPage() {
  const requireLogin = useRequireLogin();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayIso());
  const [groups, setGroups] = useState<GeneralLedgerGroup[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setGroups(
        await api.getGeneralLedger(accountId || undefined, from ? `${from}T00:00:00` : undefined, to ? `${to}T23:59:59` : undefined),
      );
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, accountId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Reports</p>
          <h1 className="text-2xl font-semibold">General Ledger</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div>
            <p className="mb-1 text-xs text-slate-400">Account</p>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
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
        ) : !groups || groups.length === 0 ? (
          <p className="text-sm text-slate-500">No activity in this range.</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.account.code} className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="font-medium text-slate-100">
                    {group.account.code} — {group.account.name}
                  </p>
                  <p className="text-xs text-slate-500">{group.account.type}</p>
                </div>
                {group.entries.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-500">No activity in this range.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Journal #</th>
                        <th className="px-4 py-2 font-medium">Reference</th>
                        <th className="px-4 py-2 text-right font-medium">Debit</th>
                        <th className="px-4 py-2 text-right font-medium">Credit</th>
                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entries.map((entry, idx) => (
                        <tr key={idx} className="border-t border-slate-800 text-slate-200">
                          <td className="px-4 py-2">{formatDate(entry.date)}</td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">JE-{String(entry.journalNo).padStart(5, '0')}</td>
                          <td className="px-4 py-2 text-slate-400">{entry.description ?? entry.reference}</td>
                          <td className="px-4 py-2 text-right">{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
                          <td className="px-4 py-2 text-right">{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
                          <td className="px-4 py-2 text-right">{entry.runningBalance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
