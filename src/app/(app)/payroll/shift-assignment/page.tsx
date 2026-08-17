'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollEmployee, type PayrollEmployeeShift, type PayrollShift } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function ShiftAssignmentPage() {
  const requireLogin = useRequireLogin();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [shifts, setShifts] = useState<PayrollShift[]>([]);
  const [assignments, setAssignments] = useState<PayrollEmployeeShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [employeeList, shiftList, assignmentList] = await Promise.all([
        api.listPayrollEmployees(),
        api.listPayrollShifts(),
        api.listPayrollEmployeeShifts(),
      ]);
      setEmployees(employeeList);
      setShifts(shiftList);
      setAssignments(assignmentList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load shift assignments');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!employeeId || !shiftId || !shiftDate) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.assignPayrollEmployeeShift({ employeeId, shiftId, shiftDate });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to assign shift');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(assignment: PayrollEmployeeShift) {
    if (!window.confirm('Remove this shift assignment?')) return;
    setBusyId(assignment.id);
    setError(null);
    try {
      await api.removePayrollEmployeeShift(assignment.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to remove shift assignment');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Shift Assigning</p>
          <h1 className="text-2xl font-semibold">Assign Shift</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleAssign} className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Employee</label>
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
                <label className="mb-1 block text-xs text-slate-400">Shift</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime}–{shift.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Date</label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="self-end rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </form>
        )}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Assignments ({assignments.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Shift</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                      No shift assignments yet.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-2">{formatDate(assignment.shiftDate)}</td>
                      <td className="px-2 py-2">
                        {assignment.employee.firstName} {assignment.employee.lastName}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{assignment.shift.name}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => handleRemove(assignment)}
                          disabled={busyId === assignment.id}
                          className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
