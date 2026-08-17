'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollAttendance, type PayrollEmployee, type PayrollLeaveType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

const LEAVE_LABEL: Record<PayrollLeaveType, string> = {
  NONE: 'Present',
  FULL_DAY: 'Full Day Leave',
  HALF_DAY: 'Half Day Leave',
  SHORT_LEAVE: 'Short Leave',
};

export default function AttendancePage() {
  const requireLogin = useRequireLogin();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [records, setRecords] = useState<PayrollAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [leaveType, setLeaveType] = useState<PayrollLeaveType>('NONE');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [employeeList, attendanceList] = await Promise.all([api.listPayrollEmployees(), api.listPayrollAttendance()]);
      setEmployees(employeeList);
      setRecords(attendanceList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMark(event: React.FormEvent) {
    event.preventDefault();
    if (!employeeId || !attendanceDate) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.markPayrollAttendance({
        employeeId,
        attendanceDate,
        inTime: inTime || undefined,
        outTime: outTime || undefined,
        leaveType,
      });
      setInTime('');
      setOutTime('');
      setLeaveType('NONE');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to mark attendance');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Attendance</p>
          <h1 className="text-2xl font-semibold">Mark Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            OT hours are worked hours minus the assigned shift&apos;s scheduled length — assign a shift first if you want OT calculated.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleMark} className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
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
                <label className="mb-1 block text-xs text-slate-400">Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">In Time</label>
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Out Time</label>
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as PayrollLeaveType)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  {(Object.keys(LEAVE_LABEL) as PayrollLeaveType[]).map((type) => (
                    <option key={type} value={type}>
                      {LEAVE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Attendance'}
            </button>
          </form>
        )}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Recent Attendance ({records.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">In</th>
                  <th className="px-2 py-2 font-medium">Out</th>
                  <th className="px-2 py-2 font-medium">Worked</th>
                  <th className="px-2 py-2 font-medium">OT</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                      No attendance recorded yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-2">{formatDate(record.attendanceDate)}</td>
                      <td className="px-2 py-2">
                        {record.employee.firstName} {record.employee.lastName}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{record.inTime ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{record.outTime ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{record.workedHours}h</td>
                      <td className="px-2 py-2 text-amber-400">{Number(record.otHours) > 0 ? `${record.otHours}h` : '—'}</td>
                      <td className="px-2 py-2 text-slate-400">{LEAVE_LABEL[record.leaveType]}</td>
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
