'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type BarProduct, type BarStockMovement } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ManageProductPage() {
  const requireLogin = useRequireLogin();
  const [products, setProducts] = useState<BarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<BarStockMovement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      setProducts(await api.listBarProducts());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleProductActive(product: BarProduct) {
    setError(null);
    try {
      await api.updateBarProduct(product.id, { isActive: !product.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update product');
    }
  }

  async function handleDeleteProduct(product: BarProduct) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setError(null);
    try {
      await api.deleteBarProduct(product.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete product');
    }
  }

  function startAdjust(product: BarProduct) {
    setAdjustingId(product.id);
    setAdjustQty('');
    setAdjustReason('');
  }

  async function submitAdjust(product: BarProduct) {
    const quantity = Number(adjustQty);
    if (!quantity) return;
    setIsAdjusting(true);
    setError(null);
    try {
      await api.adjustBarStock(product.id, { quantity, reason: adjustReason || undefined });
      setAdjustingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to adjust stock');
    } finally {
      setIsAdjusting(false);
    }
  }

  async function toggleHistory(productId: string) {
    if (historyId === productId) {
      setHistoryId(null);
      return;
    }
    setHistoryId(productId);
    setIsLoadingHistory(true);
    try {
      setHistory(await api.listBarStockMovements(productId));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load stock history');
    } finally {
      setIsLoadingHistory(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Bar · Stock</p>
            <h1 className="text-2xl font-semibold">Manage Product</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage categories under <Link href="/bar/categories" className="text-emerald-400 underline">Category</Link>.
            </p>
          </div>
          <Link
            href="/bar/items/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + New Product
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Products ({products.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-500">
              No products yet —{' '}
              <Link href="/bar/items/new" className="text-emerald-400 underline">
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
                    <th className="px-2 py-2 font-medium">Product Name</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">QTY</th>
                    <th className="px-2 py-2 font-medium">Brand Name</th>
                    <th className="px-2 py-2 font-medium">Vendor Name</th>
                    <th className="px-2 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isLow = product.reorderLevel != null && product.stockQty <= product.reorderLevel;
                    return (
                      <Fragment key={product.id}>
                        <tr className="border-t border-slate-800">
                          <td className="px-2 py-2">
                            {product.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.photo} alt="" className="h-9 w-9 rounded border border-slate-700 object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded border border-slate-700 bg-slate-800 text-xs font-medium text-slate-500">
                                {product.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className={`px-2 py-2 ${product.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                            {product.name}
                          </td>
                          <td className="px-2 py-2 text-slate-400">{product.category?.name ?? '—'}</td>
                          <td className={`px-2 py-2 ${isLow ? 'font-medium text-amber-400' : 'text-slate-300'}`}>
                            {product.stockQty}
                            {isLow && ' ⚠'}
                          </td>
                          <td className="px-2 py-2 text-slate-400">{product.brand?.name ?? '—'}</td>
                          <td className="px-2 py-2 text-slate-400">{product.vendor?.name ?? '—'}</td>
                          <td className="px-2 py-2">
                            {adjustingId === product.id ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <input
                                  type="number"
                                  placeholder="± qty"
                                  value={adjustQty}
                                  onChange={(e) => setAdjustQty(e.target.value)}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                                />
                                <input
                                  placeholder="Reason"
                                  value={adjustReason}
                                  onChange={(e) => setAdjustReason(e.target.value)}
                                  className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                                />
                                <button
                                  onClick={() => submitAdjust(product)}
                                  disabled={isAdjusting}
                                  className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setAdjustingId(null)}
                                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  onClick={() => startAdjust(product)}
                                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                                >
                                  Adjust stock
                                </button>
                                <button
                                  onClick={() => toggleHistory(product.id)}
                                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                                >
                                  {historyId === product.id ? 'Hide history' : 'History'}
                                </button>
                                <button
                                  onClick={() => toggleProductActive(product)}
                                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                                >
                                  {product.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product)}
                                  className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {historyId === product.id && (
                          <tr className="border-t border-slate-800 bg-slate-950">
                            <td colSpan={7} className="px-2 py-3">
                              {isLoadingHistory ? (
                                <p className="text-xs text-slate-500">Loading…</p>
                              ) : history.length === 0 ? (
                                <p className="text-xs text-slate-500">No movements yet.</p>
                              ) : (
                                <ul className="space-y-1 text-xs text-slate-400">
                                  {history.map((movement) => (
                                    <li key={movement.id} className="flex justify-between gap-2">
                                      <span>
                                        {movement.type} {movement.quantity > 0 ? '+' : ''}
                                        {movement.quantity}
                                        {movement.reason && <span className="text-slate-500"> · {movement.reason}</span>}
                                      </span>
                                      <span className="text-slate-500">{formatDateTime(movement.createdAt)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
