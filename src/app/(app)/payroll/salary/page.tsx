'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PayrollSalary } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatMoney(value: string | number) {
  return Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ManageSalaryPage() {
  const requireLogin = useRequireLogin();
  const [salaries, setSalaries] = useState<PayrollSalary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setSalaries(await api.listPayrollSalaries(undefined, monthFilter || undefined));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load salaries');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, monthFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Payroll · Salary</p>
            <h1 className="text-2xl font-semibold">Manage Salary</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <Link
              href="/payroll/salary/new"
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              + Calculate Salary
            </Link>
          </div>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Salary Runs ({salaries.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : salaries.length === 0 ? (
            <p className="text-sm text-slate-500">
              No salary runs yet —{' '}
              <Link href="/payroll/salary/new" className="text-emerald-400 underline">
                calculate one
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Reference</th>
                    <th className="px-2 py-2 font-medium">Employee</th>
                    <th className="px-2 py-2 font-medium">Month</th>
                    <th className="px-2 py-2 font-medium">Gross</th>
                    <th className="px-2 py-2 font-medium">Net</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-2 font-mono text-xs text-slate-400">{salary.salaryReference ?? `#${salary.salaryNo}`}</td>
                      <td className="px-2 py-2">
                        {salary.employee.firstName} {salary.employee.lastName}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{salary.salaryMonth}</td>
                      <td className="px-2 py-2 text-slate-400">Rs. {formatMoney(salary.grossSalary)}</td>
                      <td className="px-2 py-2 font-medium text-emerald-400">Rs. {formatMoney(salary.netSalary)}</td>
                      <td className="px-2 py-2">
                        <Link href={`/payroll/salary/${salary.id}`} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                          View Payslip
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
