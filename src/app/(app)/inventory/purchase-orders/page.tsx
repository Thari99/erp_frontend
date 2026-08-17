'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type InventoryPurchaseOrder } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_DOT: Record<InventoryPurchaseOrder['status'], string> = {
  OPEN: 'bg-amber-500',
  RECEIVED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

export default function ManageInventoryPurchaseOrdersPage() {
  const requireLogin = useRequireLogin();
  const [orders, setOrders] = useState<InventoryPurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function closeMenu() {
      setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [openMenuId]);

  function toggleMenu(order: InventoryPurchaseOrder, event: React.MouseEvent<HTMLButtonElement>) {
    if (openMenuId === order.id) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(order.id);
  }

  const load = useCallback(async () => {
    try {
      setOrders(await api.listInventoryPurchaseOrders());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function refLabel(order: InventoryPurchaseOrder) {
    return order.poReference ?? `PO-${order.poNo}`;
  }

  async function handleCancel(order: InventoryPurchaseOrder) {
    setOpenMenuId(null);
    if (!window.confirm(`Cancel ${refLabel(order)}?`)) return;
    setBusyId(order.id);
    setError(null);
    try {
      await api.cancelInventoryPurchaseOrder(order.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to cancel purchase order');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(order: InventoryPurchaseOrder) {
    setOpenMenuId(null);
    if (!window.confirm(`Delete ${refLabel(order)}? This can't be undone.`)) return;
    setBusyId(order.id);
    setError(null);
    try {
      await api.deleteInventoryPurchaseOrder(order.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete purchase order');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Inventory · Purchase Orders</p>
            <h1 className="text-2xl font-semibold">Manage Purchase Orders</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage suppliers under <Link href="/inventory/vendors" className="text-emerald-400 underline">Suppliers</Link>.
            </p>
          </div>
          <Link
            href="/inventory/purchase-orders/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Purchase Order
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">PO #</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No purchase orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {order.poReference ?? `PO-${String(order.poNo).padStart(5, '0')}`}
                      </td>
                      <td className="px-4 py-3">{order.vendor.name}</td>
                      <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-emerald-400 underline">
                          {order.items.length} item{order.items.length === 1 ? '' : 's'}
                        </button>
                      </td>
                      <td className="px-4 py-3">Rs. {Number(order.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-300">
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${STATUS_DOT[order.status]}`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-block text-left" ref={openMenuId === order.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => toggleMenu(order, e)}
                            disabled={busyId === order.id}
                            className="flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                          >
                            Actions
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {openMenuId === order.id && menuPosition && (
                            <div
                              style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                              className="z-50 w-40 rounded border border-slate-700 bg-slate-800 py-1 shadow-lg"
                            >
                              {order.status === 'OPEN' && (
                                <Link
                                  href={`/inventory/purchase-orders/${order.id}/edit`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                                >
                                  Edit
                                </Link>
                              )}
                              <Link
                                href={`/inventory/purchase-orders/${order.id}`}
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                              >
                                Read more
                              </Link>
                              {order.status !== 'CANCELLED' && (
                                <Link
                                  href={`/inventory/gate-pass?po=${order.id}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                                >
                                  Gate Pass
                                </Link>
                              )}
                              <Link
                                href={`/inventory/purchase-orders/${order.id}?autoprint=1`}
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                              >
                                Print
                              </Link>
                              {order.status === 'OPEN' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(order)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-amber-400 hover:bg-slate-700"
                                >
                                  Cancel
                                </button>
                              )}
                              {order.status !== 'RECEIVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(order)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-slate-700"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr className="border-t border-slate-800 bg-slate-950">
                        <td colSpan={7} className="px-4 py-3">
                          <ul className="space-y-1 text-xs text-slate-400">
                            {order.items.map((item) => (
                              <li key={item.id} className="flex justify-between">
                                <span>
                                  {item.orderedQty} × {item.item.name} @ Rs. {Number(item.unitCost).toFixed(2)}
                                </span>
                                <span>Rs. {Number(item.total).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          {order.remark && <p className="mt-2 text-xs text-slate-500">Remark: {order.remark}</p>}
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
