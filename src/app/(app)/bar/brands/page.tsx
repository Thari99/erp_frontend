'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type BarBrand } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageBrandsPage() {
  const requireLogin = useRequireLogin();
  const [brands, setBrands] = useState<BarBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try {
      setBrands(await api.listBarBrands());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(brand: BarBrand) {
    setEditingId(brand.id);
    setEditName(brand.name);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId || !editName.trim()) return;
    setBusyId(editingId);
    setError(null);
    try {
      await api.updateBarBrand(editingId, { name: editName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update brand');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(brand: BarBrand) {
    setBusyId(brand.id);
    setError(null);
    try {
      await api.updateBarBrand(brand.id, { isActive: !brand.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update brand');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(brand: BarBrand) {
    if (!window.confirm(`Delete "${brand.name}"?`)) return;
    setBusyId(brand.id);
    setError(null);
    try {
      await api.deleteBarBrand(brand.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete brand');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Bar · Brands</p>
            <h1 className="text-2xl font-semibold">Manage Brands</h1>
            <p className="mt-1 text-sm text-slate-500">Brands you can attach to bar products and cocktails.</p>
          </div>
          <Link
            href="/bar/brands/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Brand
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No brands yet —{' '}
                    <Link href="/bar/brands/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      {editingId === brand.id ? (
                        <form onSubmit={submitEdit} className="flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                            autoFocus
                            required
                          />
                          <button
                            type="submit"
                            disabled={busyId === brand.id}
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
                      ) : (
                        brand.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                          brand.isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${brand.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId !== brand.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(brand)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(brand)}
                            disabled={busyId === brand.id}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                          >
                            {brand.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(brand)}
                            disabled={busyId === brand.id}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Delete
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
      </div>
    </main>
  );
}
