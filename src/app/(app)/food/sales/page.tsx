'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type FoodSale } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function FoodSalesPage() {
  const requireLogin = useRequireLogin();
  const [sales, setSales] = useState<FoodSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSales(await api.listFoodSales());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVoid(sale: FoodSale) {
    if (!window.confirm(`Void ${sale.saleReference ?? `#${sale.saleNo}`}? The payment will be reversed.`)) return;
    setVoidingId(sale.id);
    setError(null);
    try {
      await api.voidFoodSale(sale.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to void sale');
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Food · POS</p>
          <h1 className="text-2xl font-semibold">Manage Bills</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Sale #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    No sales yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <Fragment key={sale.id}>
                    <tr className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{sale.saleReference ?? `FOOD-${String(sale.saleNo).padStart(4, '0')}`}</td>
                      <td className="px-4 py-3">{formatDateTime(sale.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{sale.orderType === 'DINE_IN' ? sale.table?.name ?? 'Dine In' : 'Takeaway'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)} className="text-emerald-400 underline">
                          {sale.items.length} item{sale.items.length === 1 ? '' : 's'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {sale.guestType === 'MEMBER' ? (
                          sale.member?.fullName ?? 'Member'
                        ) : sale.guestType === 'CLUB' ? (
                          <span className="text-amber-400">Club Use</span>
                        ) : (
                          sale.guestName || 'Walk-in'
                        )}
                      </td>
                      <td className="px-4 py-3">{sale.paymentMethod === 'MEMBER' ? 'Member A/C' : sale.paymentMethod ?? '—'}</td>
                      <td className="px-4 py-3">Rs. {Number(sale.total).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                            sale.voidedAt ? 'text-red-400' : sale.status === 'HELD' ? 'text-amber-400' : 'text-slate-300'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${sale.voidedAt ? 'bg-red-500' : sale.status === 'HELD' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {sale.voidedAt ? 'Voided' : sale.status === 'HELD' ? 'Held' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link href={`/food/sales/${sale.id}`} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                            Read more
                          </Link>
                          {sale.status === 'COMPLETED' && (
                            <Link href={`/food/sales/${sale.id}?autoprint=1`} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                              Print
                            </Link>
                          )}
                          {sale.status === 'COMPLETED' && !sale.voidedAt && (
                            <button
                              onClick={() => handleVoid(sale)}
                              disabled={voidingId === sale.id}
                              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === sale.id && (
                      <tr className="border-t border-slate-800 bg-slate-950">
                        <td colSpan={9} className="px-4 py-3">
                          <ul className="space-y-1 text-xs text-slate-400">
                            {sale.items.map((item) => (
                              <li key={item.id} className="flex justify-between">
                                <span>
                                  {item.quantity} × {item.foodItem.name} @ Rs. {Number(item.unitPrice).toFixed(2)}
                                </span>
                                <span>Rs. {Number(item.total).toFixed(2)}</span>
                              </li>
                            ))}
                            {Number(sale.discount) > 0 && (
                              <li className="flex justify-between text-slate-500">
                                <span>Discount</span>
                                <span>- Rs. {Number(sale.discount).toFixed(2)}</span>
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
