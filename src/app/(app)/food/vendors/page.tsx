'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type FoodVendor } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageFoodVendorsPage() {
  const requireLogin = useRequireLogin();
  const [vendors, setVendors] = useState<FoodVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const load = useCallback(async () => {
    try {
      setVendors(await api.listFoodVendors());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(vendor: FoodVendor) {
    setEditingId(vendor.id);
    setEditName(vendor.name);
    setEditPhone(vendor.phone ?? '');
    setEditAddress(vendor.address ?? '');
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId || !editName.trim()) return;
    setBusyId(editingId);
    setError(null);
    try {
      await api.updateFoodVendor(editingId, { name: editName.trim(), phone: editPhone || undefined, address: editAddress || undefined });
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update supplier');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(vendor: FoodVendor) {
    setBusyId(vendor.id);
    setError(null);
    try {
      await api.updateFoodVendor(vendor.id, { isActive: !vendor.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update supplier');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(vendor: FoodVendor) {
    if (!window.confirm(`Delete "${vendor.name}"?`)) return;
    setBusyId(vendor.id);
    setError(null);
    try {
      await api.deleteFoodVendor(vendor.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete supplier');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Food · Ingredient Suppliers</p>
            <h1 className="text-2xl font-semibold">Manage Suppliers</h1>
          </div>
          <Link href="/food/vendors/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Create Supplier
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Supplier Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No suppliers yet —{' '}
                    <Link href="/food/vendors/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    {editingId === vendor.id ? (
                      <td colSpan={5} className="px-4 py-3">
                        <form onSubmit={submitEdit} className="flex flex-wrap items-center gap-2">
                          <input
                            placeholder="Supplier name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                            autoFocus
                            required
                          />
                          <input
                            placeholder="Phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          />
                          <input
                            placeholder="Address"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={busyId === vendor.id}
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
                        <td className="px-4 py-3">{vendor.name}</td>
                        <td className="px-4 py-3 text-slate-400">{vendor.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{vendor.address ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                              vendor.isActive ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 flex-none rounded-full ${vendor.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(vendor)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(vendor)}
                              disabled={busyId === vendor.id}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                            >
                              {vendor.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(vendor)}
                              disabled={busyId === vendor.id}
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
