'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type FoodItem } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function ManageFoodItemsPage() {
  const requireLogin = useRequireLogin();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.listFoodItems());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAvailable(item: FoodItem) {
    setBusyId(item.id);
    setError(null);
    try {
      await api.updateFoodItem(item.id, { isAvailable: !item.isAvailable });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update item');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(item: FoodItem) {
    setBusyId(item.id);
    setError(null);
    try {
      await api.updateFoodItem(item.id, { isActive: !item.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update item');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: FoodItem) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.deleteFoodItem(item.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Food · Menu</p>
            <h1 className="text-2xl font-semibold">Manage Menu Items</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage categories under{' '}
              <Link href="/food/categories" className="text-emerald-400 underline">
                Category
              </Link>
              .
            </p>
          </div>
          <Link href="/food/items/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + New Menu Item
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Menu Items ({items.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">
              No menu items yet —{' '}
              <Link href="/food/items/new" className="text-emerald-400 underline">
                create one
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Image</th>
                    <th className="px-2 py-2 font-medium">Item Name</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Price</th>
                    <th className="px-2 py-2 font-medium">Availability</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800">
                      <td className="px-2 py-2">
                        {item.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photo} alt="" className="h-9 w-9 rounded border border-slate-700 object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded border border-slate-700 bg-slate-800 text-xs font-medium text-slate-500">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className={`px-2 py-2 ${item.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{item.name}</td>
                      <td className="px-2 py-2 text-slate-400">{item.category?.name ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-300">Rs. {Number(item.price).toFixed(2)}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                            item.isAvailable ? 'text-slate-300' : 'text-amber-400'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${item.isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {item.isAvailable ? 'Available' : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => toggleAvailable(item)}
                            disabled={busyId === item.id}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                          >
                            {item.isAvailable ? "Mark 86'd" : 'Mark Available'}
                          </button>
                          <button
                            onClick={() => toggleActive(item)}
                            disabled={busyId === item.id}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={busyId === item.id}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
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
