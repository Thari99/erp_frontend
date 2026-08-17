'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type InventoryGatePass, type InventoryPurchaseOrder } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const PAGE_SIZE = 50;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function ManageInventoryGatePassPage() {
  return (
    <Suspense fallback={null}>
      <ManageInventoryGatePassPageContent />
    </Suspense>
  );
}

function ManageInventoryGatePassPageContent() {
  const requireLogin = useRequireLogin();
  const searchParams = useSearchParams();
  const deepLinkPoId = searchParams.get('po');
  const hasHandledDeepLink = useRef(false);
  const gatePassRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const [openOrders, setOpenOrders] = useState<InventoryPurchaseOrder[]>([]);
  const [gatePasses, setGatePasses] = useState<InventoryGatePass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPassId, setHighlightedPassId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveRemark, setReceiveRemark] = useState<Record<string, string>>({});
  const [vehicleNo, setVehicleNo] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [orders, passes] = await Promise.all([api.listOpenInventoryPurchaseOrders(), api.listInventoryGatePasses()]);
      setOpenOrders(orders);
      setGatePasses(passes);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load gate passes');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return gatePasses;
    return gatePasses.filter((pass) => {
      const haystack = [
        pass.gatePassReference,
        `GP-${pass.gatePassNo}`,
        pass.purchaseOrder.poReference,
        `PO-${pass.purchaseOrder.poNo}`,
        pass.vehicleNo,
        pass.receivedBy,
        pass.purchaseOrder.vendor.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [gatePasses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPasses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPasses = filteredPasses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

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

  function toggleMenu(passId: string, event: React.MouseEvent<HTMLButtonElement>) {
    if (openMenuId === passId) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(passId);
  }

  useEffect(() => {
    if (!deepLinkPoId || hasHandledDeepLink.current || isLoading) return;
    const openOrder = openOrders.find((order) => order.id === deepLinkPoId);
    if (openOrder) {
      hasHandledDeepLink.current = true;
      startReceive(openOrder);
      return;
    }
    const passIndex = gatePasses.findIndex((p) => p.purchaseOrderId === deepLinkPoId);
    if (passIndex !== -1) {
      hasHandledDeepLink.current = true;
      const pass = gatePasses[passIndex];
      setSearch('');
      setPage(Math.floor(passIndex / PAGE_SIZE) + 1);
      setHighlightedPassId(pass.id);
      setTimeout(() => gatePassRefs.current[pass.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPoId, isLoading, openOrders, gatePasses]);

  function startReceive(order: InventoryPurchaseOrder) {
    setReceivingId(order.id);
    const defaults: Record<string, string> = {};
    for (const item of order.items) {
      defaults[item.itemId] = String(item.orderedQty);
    }
    setReceiveQty(defaults);
    setReceiveRemark({});
    setVehicleNo('');
  }

  function damageQtyFor(order: InventoryPurchaseOrder, itemId: string) {
    const line = order.items.find((i) => i.itemId === itemId);
    const ordered = line?.orderedQty ?? 0;
    const received = Number(receiveQty[itemId] ?? 0);
    return Math.max(ordered - received, 0);
  }

  async function submitReceive(order: InventoryPurchaseOrder) {
    const items = order.items
      .map((line) => ({
        itemId: line.itemId,
        receivedQty: Number(receiveQty[line.itemId] ?? 0),
        damageQty: damageQtyFor(order, line.itemId),
        remark: receiveRemark[line.itemId]?.trim() || undefined,
      }))
      .filter((line) => line.receivedQty >= 0);
    setIsReceiving(true);
    setError(null);
    try {
      await api.receiveInventoryGatePass({ purchaseOrderId: order.id, vehicleNo: vehicleNo.trim() || undefined, items });
      setReceivingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to receive purchase order');
    } finally {
      setIsReceiving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Inventory</p>
          <h1 className="text-2xl font-semibold">Manage Gate Pass</h1>
          <p className="mt-1 text-sm text-slate-500">Receive purchase orders — stock updates automatically.</p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Awaiting Receipt ({openOrders.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : openOrders.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing awaiting receipt.</p>
          ) : (
            <ul className="space-y-3">
              {openOrders.map((order) => (
                <li key={order.id} className="rounded border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {order.poReference ?? `PO-${String(order.poNo).padStart(5, '0')}`} — {order.vendor.name}
                      </p>
                      <p className="text-xs text-slate-500">Rs. {Number(order.totalAmount).toFixed(2)} · {order.items.length} item(s)</p>
                    </div>
                    {receivingId !== order.id && (
                      <button
                        onClick={() => startReceive(order)}
                        className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-500"
                      >
                        Receive
                      </button>
                    )}
                  </div>

                  {receivingId === order.id && (
                    <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <label className="w-24 flex-none text-slate-400">Vehicle No</label>
                        <input
                          type="text"
                          value={vehicleNo}
                          onChange={(e) => setVehicleNo(e.target.value)}
                          placeholder="Ex: NC-4521"
                          className="w-full max-w-xs rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        />
                      </div>

                      {order.items.map((line) => (
                        <div key={line.id} className="rounded border border-slate-800 bg-slate-950/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-slate-300">
                              {line.item.name} <span className="text-slate-500">(ordered {line.orderedQty})</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Received</label>
                              <input
                                type="number"
                                value={receiveQty[line.itemId] ?? ''}
                                onChange={(e) => setReceiveQty((prev) => ({ ...prev, [line.itemId]: e.target.value }))}
                                className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm"
                                min={0}
                              />
                              <label className="text-xs text-slate-500">Damage/Short</label>
                              <input
                                type="text"
                                readOnly
                                value={damageQtyFor(order, line.itemId)}
                                className="w-16 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-right text-sm text-slate-400"
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <label className="text-xs text-slate-500">Condition/Remark</label>
                            <input
                              type="text"
                              value={receiveRemark[line.itemId] ?? ''}
                              onChange={(e) => setReceiveRemark((prev) => ({ ...prev, [line.itemId]: e.target.value }))}
                              placeholder="Ex: 2 reams water-damaged"
                              className="min-w-[10rem] flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => submitReceive(order)}
                          disabled={isReceiving}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isReceiving ? 'Receiving…' : 'Confirm receipt'}
                        </button>
                        <button
                          onClick={() => setReceivingId(null)}
                          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Manage Gate Pass ({filteredPasses.length})</h2>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Gate pass"
            className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500"
          />

          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Reference No</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">PO Reference No</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Date</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Vehicle No</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Created By</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Status</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : pagedPasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      {gatePasses.length === 0 ? 'Nothing received yet.' : 'No gate passes match your search.'}
                    </td>
                  </tr>
                ) : (
                  pagedPasses.map((pass) => (
                    <tr
                      key={pass.id}
                      ref={(el) => {
                        gatePassRefs.current[pass.id] = el;
                      }}
                      className={`border-t border-slate-800 text-slate-200 ${
                        highlightedPassId === pass.id ? 'bg-emerald-950/30' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-300">
                        {pass.gatePassReference ?? `GP-${String(pass.gatePassNo).padStart(5, '0')}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400">
                        {pass.purchaseOrder.poReference ?? `PO-${String(pass.purchaseOrder.poNo).padStart(5, '0')}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(pass.receivedAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{pass.vehicleNo ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{pass.receivedBy}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                          Received
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="inline-block text-left" ref={openMenuId === pass.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => toggleMenu(pass.id, e)}
                            className="flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
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

                          {openMenuId === pass.id && menuPosition && (
                            <div
                              style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                              className="z-50 w-36 rounded border border-slate-700 bg-slate-800 py-1 shadow-lg"
                            >
                              <Link
                                href={`/inventory/gate-pass/${pass.id}`}
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                              >
                                Read more
                              </Link>
                              <Link
                                href={`/inventory/gate-pass/${pass.id}?autoprint=1`}
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                              >
                                Print
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredPasses.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredPasses.length)} of{' '}
                {filteredPasses.length} results
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-slate-500 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`rounded px-2.5 py-1 ${
                        n === currentPage ? 'bg-emerald-600 text-white' : 'border border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-slate-500 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
