'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollDepartment } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateJobPositionPage() {
  const requireLogin = useRequireLogin();
  const [departments, setDepartments] = useState<PayrollDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [basicPerDay, setBasicPerDay] = useState('');
  const [otPerHour, setOtPerHour] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setDepartments(await api.listPayrollDepartments());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await api.createPayrollJobPosition({
        name,
        departmentId: departmentId || undefined,
        basicPerDay: basicPerDay ? Number(basicPerDay) : undefined,
        otPerHour: otPerHour ? Number(otPerHour) : undefined,
      });
      setName('');
      setDepartmentId('');
      setBasicPerDay('');
      setOtPerHour('');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add job position');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Setup</p>
          <h1 className="text-2xl font-semibold">Create Job Position</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Job position added.</p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Position Name</label>
              <input
                placeholder="e.g. HR Executive"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Basic Salary / Day</label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={basicPerDay}
                onChange={(e) => setBasicPerDay(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                step="0.01"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">OT Rate / Hour</label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={otPerHour}
                onChange={(e) => setOtPerHour(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                step="0.01"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Adding…' : 'Add job position'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
