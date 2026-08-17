'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type BarSalesReport } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BarSalesReportPage() {
  const requireLogin = useRequireLogin();
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<BarSalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await api.barSalesReport(from ? `${from}T00:00:00` : undefined, to ? `${to}T23:59:59` : undefined));
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
          <p className="text-sm text-emerald-400">Bar · Reports</p>
          <h1 className="text-2xl font-semibold">Sales Report</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div>
            <p className="mb-1 text-xs text-slate-400">From</p>
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
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Revenue</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">Rs. {report.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Sales</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{report.saleCount}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cash / Card</p>
                <p className="mt-1 text-sm text-slate-300">
                  Rs. {(report.totalsByMethod.CASH ?? 0).toFixed(2)} / Rs. {(report.totalsByMethod.CARD ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Top Products</h2>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">No sales in this range.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 font-medium">Qty sold</th>
                      <th className="px-2 py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.map((product) => (
                      <tr key={product.productId} className="border-t border-slate-800">
                        <td className="px-2 py-2 text-slate-200">{product.name}</td>
                        <td className="px-2 py-2 text-slate-300">{product.quantity}</td>
                        <td className="px-2 py-2 text-slate-300">Rs. {product.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
