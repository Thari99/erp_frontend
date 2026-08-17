'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PayrollEmployee } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageEmployeePage() {
  const requireLogin = useRequireLogin();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEmployees(await api.listPayrollEmployees());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(employee: PayrollEmployee) {
    setBusyId(employee.id);
    setError(null);
    try {
      const nextStatus = employee.status === 'ACTIVE' ? 'RESIGNED' : 'ACTIVE';
      await api.updatePayrollEmployee(employee.id, {
        status: nextStatus,
        resignDate: nextStatus === 'RESIGNED' ? new Date().toISOString().slice(0, 10) : undefined,
      });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update employee');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Payroll · Employee</p>
            <h1 className="text-2xl font-semibold">Manage Employee</h1>
          </div>
          <Link
            href="/payroll/employees/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Register Employee
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Employees ({employees.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-slate-500">
              No employees yet —{' '}
              <Link href="/payroll/employees/new" className="text-emerald-400 underline">
                register one
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Reference</th>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Department</th>
                    <th className="px-2 py-2 font-medium">Position</th>
                    <th className="px-2 py-2 font-medium">Mobile</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-slate-800">
                      <td className="px-2 py-2 font-mono text-xs text-slate-400">{employee.employeeReference ?? `#${employee.empNo}`}</td>
                      <td className={`px-2 py-2 ${employee.status === 'ACTIVE' ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                        {employee.title ? `${employee.title} ` : ''}
                        {employee.firstName} {employee.lastName}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{employee.department?.name ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{employee.position?.name ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{employee.mobile ?? '—'}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                            employee.status === 'ACTIVE' ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          {employee.status === 'ACTIVE' ? 'Active' : 'Resigned'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => toggleStatus(employee)}
                          disabled={busyId === employee.id}
                          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                        >
                          {employee.status === 'ACTIVE' ? 'Mark Resigned' : 'Reactivate'}
                        </button>
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
