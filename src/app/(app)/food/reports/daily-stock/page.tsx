'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type FoodDailyStockReport } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function FoodDailyStockReportPage() {
  const requireLogin = useRequireLogin();
  const [date, setDate] = useState(today());
  const [report, setReport] = useState<FoodDailyStockReport | null>(null);
  const [onlyActivity, setOnlyActivity] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await api.foodDailyStockReport(date));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [date, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = report ? (onlyActivity ? report.rows.filter((r) => r.stockIn !== 0 || r.stockOut !== 0) : report.rows) : [];

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Food · Reports</p>
            <h1 className="text-2xl font-semibold">Daily Stock Report</h1>
            <p className="mt-1 text-sm text-slate-500">Opening, received, and closing balance per ingredient for one day.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today()}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <label className="mb-3 flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={onlyActivity} onChange={(e) => setOnlyActivity(e.target.checked)} />
          Only show ingredients with movement that day
        </label>

        <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Ingredient</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Opening</th>
                <th className="px-3 py-2 font-medium">Stock In</th>
                <th className="px-3 py-2 font-medium">Stock Out</th>
                <th className="px-3 py-2 font-medium">Closing</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    {onlyActivity ? 'No stock movement on this day.' : 'No ingredients found.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-slate-400">{row.category ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-400">{row.unit ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-400">{row.opening}</td>
                    <td className="px-3 py-2 text-emerald-400">{row.stockIn > 0 ? `+${row.stockIn}` : '—'}</td>
                    <td className="px-3 py-2 text-red-400">{row.stockOut > 0 ? `-${row.stockOut}` : '—'}</td>
                    <td className="px-3 py-2 font-medium text-slate-100">{row.closing}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
