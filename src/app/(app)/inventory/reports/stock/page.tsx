'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type InventoryStockReport } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function InventoryStockReportPage() {
  const requireLogin = useRequireLogin();
  const [report, setReport] = useState<InventoryStockReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReport(await api.inventoryStockReport());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Inventory · Reports</p>
          <h1 className="text-2xl font-semibold">Stock Report</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !report ? null : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Stock Value</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">Rs. {report.totalStockValue.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Low Stock Items</p>
                <p className="mt-1 text-xl font-semibold text-amber-400">{report.lowStockCount}</p>
              </div>
            </div>

            <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Supplier</th>
                    <th className="px-2 py-2 font-medium">Stock</th>
                    <th className="px-2 py-2 font-medium">Reorder</th>
                    <th className="px-2 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800">
                      <td className="px-2 py-2 text-slate-200">{row.name}</td>
                      <td className="px-2 py-2 text-slate-400">{row.category ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{row.vendor ?? '—'}</td>
                      <td className={`px-2 py-2 ${row.isLow ? 'font-medium text-amber-400' : 'text-slate-300'}`}>
                        {row.stockQty}
                        {row.isLow && ' ⚠'}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{row.reorderLevel ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-300">Rs. {row.stockValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
