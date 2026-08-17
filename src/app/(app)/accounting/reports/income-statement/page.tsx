'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type IncomeStatementReport, type IncomeStatementRow } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, rows, total }: { title: string; rows: IncomeStatementRow[]; total: number }) {
  return (
    <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium uppercase tracking-wide text-slate-400">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">No activity in this range.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-800 text-slate-200">
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.code}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right">{row.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 font-medium text-slate-100">
              <td className="px-4 py-2" colSpan={2}>
                Total {title}
              </td>
              <td className="px-4 py-2 text-right">{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

export default function IncomeStatementPage() {
  const requireLogin = useRequireLogin();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await api.getIncomeStatement(from ? `${from}T00:00:00` : undefined, to ? `${to}T23:59:59` : undefined));
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
          <h1 className="text-2xl font-semibold">Income Statement</h1>
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
          <div className="space-y-6">
            <Section title="Income" rows={report.income} total={report.totalIncome} />
            <Section title="Expenses" rows={report.expenses} total={report.totalExpenses} />

            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                report.netIncome >= 0 ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : 'border-red-900 bg-red-950 text-red-300'
              }`}
            >
              Net {report.netIncome >= 0 ? 'Income' : 'Loss'}: {report.netIncome.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
