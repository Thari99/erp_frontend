'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type InventoryStockOut } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ManageInventoryStockOutPage() {
  const requireLogin = useRequireLogin();
  const [issues, setIssues] = useState<InventoryStockOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIssues(await api.listInventoryStockOuts());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load stock-out records');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Inventory · Stock Out</p>
            <h1 className="text-2xl font-semibold">Manage Stock Out</h1>
          </div>
          <Link
            href="/inventory/stock-out/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Issue Stock
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Reference No</th>
                <th className="px-4 py-3 font-medium">Issued To</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Issued By</th>
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
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No stock-out records yet.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <Fragment key={issue.id}>
                    <tr className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {issue.issueReference ?? `ISS-${String(issue.issueNo).padStart(4, '0')}`}
                      </td>
                      <td className="px-4 py-3">{issue.issuedTo}</td>
                      <td className="px-4 py-3">{formatDateTime(issue.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)} className="text-emerald-400 underline">
                          {issue.items.length} item{issue.items.length === 1 ? '' : 's'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{issue.issuedBy ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/inventory/stock-out/${issue.id}`}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            Read more
                          </Link>
                          <Link
                            href={`/inventory/stock-out/${issue.id}?autoprint=1`}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            Print
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {expandedId === issue.id && (
                      <tr className="border-t border-slate-800 bg-slate-950">
                        <td colSpan={6} className="px-4 py-3">
                          <ul className="space-y-1 text-xs text-slate-400">
                            {issue.items.map((line) => (
                              <li key={line.id} className="flex justify-between">
                                <span>
                                  {line.quantity} × {line.item.name} @ Rs. {Number(line.unitPrice).toFixed(2)}
                                </span>
                                <span>Rs. {Number(line.total).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          {issue.remark && <p className="mt-2 text-xs text-slate-500">Remark: {issue.remark}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
