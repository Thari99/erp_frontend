'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollEpfEtfReport } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(value: number) {
  return value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EpfEtfReportPage() {
  const requireLogin = useRequireLogin();
  const [salaryMonth, setSalaryMonth] = useState(currentMonth());
  const [report, setReport] = useState<PayrollEpfEtfReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await api.payrollEpfEtfReport(salaryMonth));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [salaryMonth, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = report?.rows ?? [];

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Payroll · Reports</p>
            <h1 className="text-2xl font-semibold">EPF / ETF Report</h1>
            <p className="mt-1 text-sm text-slate-500">EPF (employee 8% + employer 12%) and ETF (3%) totals per calculated salary run.</p>
          </div>
          <input
            type="month"
            value={salaryMonth}
            onChange={(e) => setSalaryMonth(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">EPF No</th>
                <th className="px-3 py-2 font-medium">ETF No</th>
                <th className="px-3 py-2 font-medium">Basic Salary</th>
                <th className="px-3 py-2 font-medium">EPF Employee (8%)</th>
                <th className="px-3 py-2 font-medium">EPF Employer (12%)</th>
                <th className="px-3 py-2 font-medium">EPF Total</th>
                <th className="px-3 py-2 font-medium">ETF (3%)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No salary runs calculated for this month.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.employeeId} className="border-t border-slate-800 text-slate-200">
                    <td className="px-3 py-2">
                      {row.employeeReference ?? '—'} — {row.employeeName}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{row.epfNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-400">{row.etfNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-400">Rs. {formatMoney(row.basicSalary)}</td>
                    <td className="px-3 py-2 text-slate-400">Rs. {formatMoney(row.epfEmployee)}</td>
                    <td className="px-3 py-2 text-slate-400">Rs. {formatMoney(row.epfEmployer)}</td>
                    <td className="px-3 py-2 font-medium text-slate-100">Rs. {formatMoney(row.epfTotal)}</td>
                    <td className="px-3 py-2 text-slate-400">Rs. {formatMoney(row.etf)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {report && rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-950 font-medium text-slate-100">
                  <td className="px-3 py-2" colSpan={4}>
                    Totals
                  </td>
                  <td className="px-3 py-2">Rs. {formatMoney(report.totalEpfEmployee)}</td>
                  <td className="px-3 py-2">Rs. {formatMoney(report.totalEpfEmployer)}</td>
                  <td className="px-3 py-2">Rs. {formatMoney(report.totalEpfEmployer + report.totalEpfEmployee)}</td>
                  <td className="px-3 py-2">Rs. {formatMoney(report.totalEtf)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      </div>
    </main>
  );
}
