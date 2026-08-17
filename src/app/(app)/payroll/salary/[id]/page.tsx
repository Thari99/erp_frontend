'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, type PayrollSalary } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatMoney(value: string | number) {
  return Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function PayslipDetailPage() {
  return (
    <Suspense fallback={null}>
      <PayslipDetailPageContent />
    </Suspense>
  );
}

function PayslipDetailPageContent() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === '1';
  const hasAutoPrinted = useRef(false);

  const [salary, setSalary] = useState<PayrollSalary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getPayrollSalary(params.id)
      .then(setSalary)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load payslip');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, requireLogin]);

  useEffect(() => {
    if (autoprint && salary && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoprint, salary]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !salary) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>{error ?? 'Salary run not found'}</p>
      </main>
    );
  }

  const employee = salary.employee;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50 print:bg-white print:px-0 print:text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Print
          </button>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 print:border-black print:bg-white">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-400 print:text-black">Payslip</p>
              <h1 className="text-2xl font-semibold">{salary.salaryReference ?? `PAY-${String(salary.salaryNo).padStart(4, '0')}`}</h1>
            </div>
            <p className="text-sm text-slate-400 print:text-black">Salary Month: {salary.salaryMonth}</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Employee: </span>
              {employee.employeeReference ?? `#${employee.empNo}`} — {employee.title ? `${employee.title} ` : ''}
              {employee.firstName} {employee.lastName}
            </p>
            <p>
              <span className="text-slate-500">Department: </span>
              {employee.department?.name ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Position: </span>
              {employee.position?.name ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">EPF No: </span>
              {employee.epfNumber ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">ETF No: </span>
              {employee.etfNumber ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Generated: </span>
              {formatDate(salary.createdAt)}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-2 rounded border border-slate-800 p-3 text-sm sm:grid-cols-4 print:border-black">
            <p>
              <span className="text-slate-500">Working Days: </span>
              {salary.workingDays}
            </p>
            <p>
              <span className="text-slate-500">Full-Day Leaves: </span>
              {salary.fullDayLeaves}
            </p>
            <p>
              <span className="text-slate-500">Half-Day Leaves: </span>
              {salary.halfDayLeaves}
            </p>
            <p>
              <span className="text-slate-500">Short Leaves: </span>
              {salary.shortLeaves}
            </p>
            <p>
              <span className="text-slate-500">OT Hours: </span>
              {salary.totalOtHours}
            </p>
            <p>
              <span className="text-slate-500">Payable OT: </span>
              Rs. {formatMoney(salary.payableOt)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="overflow-x-auto rounded border border-slate-800 print:border-black">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500 print:bg-white print:text-black">
                    <th className="px-3 py-2 font-medium">Earnings</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-800 print:border-black">
                    <td className="px-3 py-2">Basic Salary</td>
                    <td className="px-3 py-2 text-right">Rs. {formatMoney(salary.basicSalary)}</td>
                  </tr>
                  {Number(salary.payableOt) > 0 && (
                    <tr className="border-t border-slate-800 print:border-black">
                      <td className="px-3 py-2">OT Payment</td>
                      <td className="px-3 py-2 text-right">Rs. {formatMoney(salary.payableOt)}</td>
                    </tr>
                  )}
                  {salary.allowances.map((line) => (
                    <tr key={line.id} className="border-t border-slate-800 print:border-black">
                      <td className="px-3 py-2">{line.allowanceType.name}</td>
                      <td className="px-3 py-2 text-right">Rs. {formatMoney(line.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700 font-medium print:border-black">
                    <td className="px-3 py-2">Gross Salary</td>
                    <td className="px-3 py-2 text-right">Rs. {formatMoney(salary.grossSalary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded border border-slate-800 print:border-black">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500 print:bg-white print:text-black">
                    <th className="px-3 py-2 font-medium">Deductions</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-800 print:border-black">
                    <td className="px-3 py-2">EPF (Employee 8%)</td>
                    <td className="px-3 py-2 text-right">Rs. {formatMoney(salary.epfEmployee)}</td>
                  </tr>
                  {salary.deductions.map((line) => (
                    <tr key={line.id} className="border-t border-slate-800 print:border-black">
                      <td className="px-3 py-2">{line.deductionType.name}</td>
                      <td className="px-3 py-2 text-right">Rs. {formatMoney(line.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700 font-medium print:border-black">
                    <td className="px-3 py-2">Total Deductions</td>
                    <td className="px-3 py-2 text-right">
                      Rs. {formatMoney(Number(salary.totalDeduction) + Number(salary.epfEmployee))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded border border-emerald-800 bg-emerald-950 px-4 py-3 print:border-black print:bg-white">
            <span className="text-sm font-medium text-emerald-300 print:text-black">Net Salary</span>
            <span className="text-xl font-semibold text-emerald-300 print:text-black">Rs. {formatMoney(salary.netSalary)}</span>
          </div>

          <p className="mt-4 text-xs text-slate-500 print:text-black">
            Employer cost (not deducted from employee): EPF Employer 12% Rs. {formatMoney(salary.epfEmployer)}, ETF 3% Rs. {formatMoney(salary.etf)}.
          </p>

          {salary.remark && (
            <p className="mt-2 text-sm text-slate-400 print:text-black">
              <span className="text-slate-500">Remark: </span>
              {salary.remark}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
