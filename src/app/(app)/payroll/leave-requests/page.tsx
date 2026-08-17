'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollEmployee, type PayrollLeaveRequest, type PayrollLeaveType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

const LEAVE_LABEL: Record<PayrollLeaveType, string> = {
  NONE: 'None',
  FULL_DAY: 'Full Day',
  HALF_DAY: 'Half Day',
  SHORT_LEAVE: 'Short Leave',
};

const STATUS_STYLES: Record<PayrollLeaveRequest['status'], string> = {
  PENDING: 'bg-amber-950 text-amber-400',
  APPROVED: 'bg-emerald-950 text-emerald-400',
  REJECTED: 'bg-red-950 text-red-400',
};

export default function LeaveRequestPage() {
  const requireLogin = useRequireLogin();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [requests, setRequests] = useState<PayrollLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<PayrollLeaveType>('FULL_DAY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [employeeList, requestList] = await Promise.all([api.listPayrollEmployees(), api.listPayrollLeaveRequests()]);
      setEmployees(employeeList);
      setRequests(requestList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!employeeId || !startDate || !endDate) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.createPayrollLeaveRequest({ employeeId, leaveType, startDate, endDate, reason: reason || undefined });
      setStartDate('');
      setEndDate('');
      setReason('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create leave request');
    } finally {
      setIsSaving(false);
    }
  }

  async function resolve(request: PayrollLeaveRequest, status: 'APPROVED' | 'REJECTED') {
    setBusyId(request.id);
    setError(null);
    try {
      await api.resolvePayrollLeaveRequest(request.id, { status });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to resolve leave request');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Leave Request</p>
          <h1 className="text-2xl font-semibold">Leave Requests</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                <label className="mb-1 block text-xs text-slate-400">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as PayrollLeaveType)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="SHORT_LEAVE">Short Leave</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-slate-400">Reason (optional)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Submitting…' : 'Submit Leave Request'}
            </button>
          </form>
        )}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Requests ({requests.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Dates</th>
                  <th className="px-2 py-2 font-medium">Reason</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-2">
                        {request.employee.firstName} {request.employee.lastName}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{LEAVE_LABEL[request.leaveType]}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {formatDate(request.startDate)} – {formatDate(request.endDate)}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{request.reason ?? '—'}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[request.status]}`}>{request.status}</span>
                      </td>
                      <td className="px-2 py-2">
                        {request.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => resolve(request, 'APPROVED')}
                              disabled={busyId === request.id}
                              className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => resolve(request, 'REJECTED')}
                              disabled={busyId === request.id}
                              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
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
