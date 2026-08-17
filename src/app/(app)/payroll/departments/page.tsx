'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PayrollDepartment } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageDepartmentPage() {
  const requireLogin = useRequireLogin();
  const [departments, setDepartments] = useState<PayrollDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editShortCode, setEditShortCode] = useState('');

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

  function startEdit(department: PayrollDepartment) {
    setEditingId(department.id);
    setEditName(department.name);
    setEditShortCode(department.shortCode ?? '');
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId || !editName.trim()) return;
    setBusyId(editingId);
    setError(null);
    try {
      await api.updatePayrollDepartment(editingId, { name: editName.trim(), shortCode: editShortCode || undefined });
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update department');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(department: PayrollDepartment) {
    setBusyId(department.id);
    setError(null);
    try {
      await api.updatePayrollDepartment(department.id, { isActive: !department.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update department');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(department: PayrollDepartment) {
    if (!window.confirm(`Delete "${department.name}"?`)) return;
    setBusyId(department.id);
    setError(null);
    try {
      await api.deletePayrollDepartment(department.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete department');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Payroll · Setup</p>
            <h1 className="text-2xl font-semibold">Manage Department</h1>
          </div>
          <Link
            href="/payroll/departments/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Department
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Short Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No departments yet —{' '}
                    <Link href="/payroll/departments/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    {editingId === department.id ? (
                      <td colSpan={4} className="px-4 py-3">
                        <form onSubmit={submitEdit} className="flex flex-wrap items-center gap-2">
                          <input
                            placeholder="Department name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                            autoFocus
                            required
                          />
                          <input
                            placeholder="Short code"
                            value={editShortCode}
                            onChange={(e) => setEditShortCode(e.target.value)}
                            className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={busyId === department.id}
                            className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">{department.name}</td>
                        <td className="px-4 py-3 text-slate-400">{department.shortCode ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                              department.isActive ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 flex-none rounded-full ${department.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                            {department.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(department)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(department)}
                              disabled={busyId === department.id}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                            >
                              {department.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(department)}
                              disabled={busyId === department.id}
                              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
