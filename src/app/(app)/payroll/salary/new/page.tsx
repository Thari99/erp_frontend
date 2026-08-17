'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  ApiError,
  type PayrollAllowanceType,
  type PayrollDeductionType,
  type PayrollEmployee,
} from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

interface Line {
  typeId: string;
  name: string;
  amount: number;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function CalculateSalaryPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [allowanceTypes, setAllowanceTypes] = useState<PayrollAllowanceType[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<PayrollDeductionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(currentMonth());
  const [remark, setRemark] = useState('');
  const [allowances, setAllowances] = useState<Line[]>([]);
  const [deductions, setDeductions] = useState<Line[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [stagingAllowanceId, setStagingAllowanceId] = useState('');
  const [stagingAllowanceAmount, setStagingAllowanceAmount] = useState('');
  const [stagingDeductionId, setStagingDeductionId] = useState('');
  const [stagingDeductionAmount, setStagingDeductionAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const [employeeList, allowanceList, deductionList] = await Promise.all([
        api.listPayrollEmployees(),
        api.listPayrollAllowanceTypes(),
        api.listPayrollDeductionTypes(),
      ]);
      setEmployees(employeeList.filter((e) => e.status === 'ACTIVE'));
      setAllowanceTypes(allowanceList);
      setDeductionTypes(deductionList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const allowanceById = useMemo(() => new Map(allowanceTypes.map((a) => [a.id, a])), [allowanceTypes]);
  const deductionById = useMemo(() => new Map(deductionTypes.map((d) => [d.id, d])), [deductionTypes]);

  function handleAllowanceTypeChange(id: string) {
    setStagingAllowanceId(id);
    const type = allowanceById.get(id);
    if (type && !stagingAllowanceAmount) setStagingAllowanceAmount(type.defaultAmount);
  }

  function handleDeductionTypeChange(id: string) {
    setStagingDeductionId(id);
    const type = deductionById.get(id);
    if (type && !stagingDeductionAmount) setStagingDeductionAmount(type.defaultAmount);
  }

  function addAllowance() {
    const type = allowanceById.get(stagingAllowanceId);
    const amount = Number(stagingAllowanceAmount);
    if (!type || !amount) return;
    setAllowances((prev) => [...prev, { typeId: type.id, name: type.name, amount }]);
    setStagingAllowanceId('');
    setStagingAllowanceAmount('');
  }

  function addDeduction() {
    const type = deductionById.get(stagingDeductionId);
    const amount = Number(stagingDeductionAmount);
    if (!type || !amount) return;
    setDeductions((prev) => [...prev, { typeId: type.id, name: type.name, amount }]);
    setStagingDeductionId('');
    setStagingDeductionAmount('');
  }

  async function handleCalculate(event: React.FormEvent) {
    event.preventDefault();
    if (!employeeId || !salaryMonth) return;
    setError(null);
    setIsSaving(true);
    try {
      const salary = await api.calculatePayrollSalary({
        employeeId,
        salaryMonth,
        allowances: allowances.map((a) => ({ allowanceTypeId: a.typeId, amount: a.amount })),
        deductions: deductions.map((d) => ({ deductionTypeId: d.typeId, amount: d.amount })),
        remark: remark || undefined,
      });
      router.push(`/payroll/salary/${salary.id}`);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to calculate salary');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Salary</p>
          <h1 className="text-2xl font-semibold">Calculate Salary</h1>
          <p className="mt-1 text-sm text-slate-500">
            Working days, OT hours, and leave counts are pulled automatically from that month&apos;s attendance.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCalculate} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Employee <span className="text-red-400">*</span>
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeReference ?? `#${employee.empNo}`} — {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Salary Month <span className="text-red-400">*</span>
                </label>
                <input
                  type="month"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Allowances</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <select
                  value={stagingAllowanceId}
                  onChange={(e) => handleAllowanceTypeChange(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">Select allowance</option>
                  {allowanceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={stagingAllowanceAmount}
                  onChange={(e) => setStagingAllowanceAmount(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  min={0}
                  step="0.01"
                />
                <button
                  type="button"
                  onClick={addAllowance}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  +
                </button>
              </div>
              {allowances.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {allowances.map((line, index) => (
                    <li key={index} className="flex items-center justify-between rounded border border-slate-800 px-3 py-1.5">
                      <span>{line.name}</span>
                      <span className="flex items-center gap-2">
                        Rs. {line.amount.toFixed(2)}
                        <button
                          type="button"
                          onClick={() => setAllowances((prev) => prev.filter((_, i) => i !== index))}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Deductions</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <select
                  value={stagingDeductionId}
                  onChange={(e) => handleDeductionTypeChange(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">Select deduction</option>
                  {deductionTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={stagingDeductionAmount}
                  onChange={(e) => setStagingDeductionAmount(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  min={0}
                  step="0.01"
                />
                <button
                  type="button"
                  onClick={addDeduction}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  +
                </button>
              </div>
              {deductions.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {deductions.map((line, index) => (
                    <li key={index} className="flex items-center justify-between rounded border border-slate-800 px-3 py-1.5">
                      <span>{line.name}</span>
                      <span className="flex items-center gap-2">
                        Rs. {line.amount.toFixed(2)}
                        <button
                          type="button"
                          onClick={() => setDeductions((prev) => prev.filter((_, i) => i !== index))}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Remark (optional)</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Calculating…' : 'Calculate Salary'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
