'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type ChartOfAccount } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const TYPE_ORDER: ChartOfAccount['type'][] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

export default function ManageChartOfAccountsPage() {
  const requireLogin = useRequireLogin();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try {
      setAccounts(await api.listAccounts());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(account: ChartOfAccount) {
    setEditingId(account.id);
    setEditName(account.name);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId || !editName.trim()) return;
    setBusyId(editingId);
    setError(null);
    try {
      await api.updateAccount(editingId, { name: editName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update account');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(account: ChartOfAccount) {
    setBusyId(account.id);
    setError(null);
    try {
      await api.updateAccount(account.id, { isActive: !account.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update account');
    } finally {
      setBusyId(null);
    }
  }

  const grouped = TYPE_ORDER.map((type) => ({ type, rows: accounts.filter((a) => a.type === type) })).filter((g) => g.rows.length > 0);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Accounting · Chart of Accounts</p>
            <h1 className="text-2xl font-semibold">Manage Chart of Accounts</h1>
          </div>
          <Link
            href="/accounting/chart-of-accounts/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Account
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ type, rows }) => (
              <section key={type} className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
                <h2 className="border-b border-slate-800 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </h2>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">Code</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Normal Balance</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((account) => (
                      <tr key={account.id} className="border-t border-slate-800 text-slate-200">
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">{account.code}</td>
                        <td className="px-4 py-2">
                          {editingId === account.id ? (
                            <form onSubmit={submitEdit} className="flex items-center gap-2">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                                autoFocus
                                required
                              />
                              <button
                                type="submit"
                                disabled={busyId === account.id}
                                className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            account.name
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{account.normalBalance === 'DEBIT' ? 'Debit' : 'Credit'}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                              account.isActive ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 flex-none rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {editingId !== account.id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(account)}
                                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleActive(account)}
                                disabled={busyId === account.id}
                                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                              >
                                {account.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
