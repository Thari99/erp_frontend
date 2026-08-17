'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, type FoodGatePass } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function FoodGatePassDetailPage() {
  return (
    <Suspense fallback={null}>
      <FoodGatePassDetailPageContent />
    </Suspense>
  );
}

function FoodGatePassDetailPageContent() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === '1';
  const hasAutoPrinted = useRef(false);

  const [gatePass, setGatePass] = useState<FoodGatePass | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getFoodGatePass(params.id)
      .then(setGatePass)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load gate pass');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, requireLogin]);

  useEffect(() => {
    if (autoprint && gatePass && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoprint, gatePass]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !gatePass) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>{error ?? 'Gate pass not found'}</p>
      </main>
    );
  }

  const orderedQtyByStockItem = new Map(gatePass.purchaseOrder.items.map((item) => [item.stockItemId, item.orderedQty]));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50 print:bg-white print:px-0 print:text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back
          </button>
          <button onClick={() => window.print()} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
            Print
          </button>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 print:border-black print:bg-white">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-400 print:text-black">Gate Pass</p>
              <h1 className="text-2xl font-semibold">{gatePass.gatePassReference ?? `GPF-${String(gatePass.gatePassNo).padStart(5, '0')}`}</h1>
            </div>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-300 print:text-black">
              <span className="h-2 w-2 flex-none rounded-full bg-emerald-500" />
              Received
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Supplier: </span>
              {gatePass.purchaseOrder.vendor.name}
            </p>
            <p>
              <span className="text-slate-500">PO Reference: </span>
              {gatePass.purchaseOrder.poReference ?? `PO-${String(gatePass.purchaseOrder.poNo).padStart(5, '0')}`}
            </p>
            <p>
              <span className="text-slate-500">Date: </span>
              {formatDateTime(gatePass.receivedAt)}
            </p>
            <p>
              <span className="text-slate-500">Vehicle No: </span>
              {gatePass.vehicleNo ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Created by: </span>
              {gatePass.receivedBy}
            </p>
          </div>

          <div className="overflow-x-auto rounded border border-slate-800 print:border-black">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500 print:bg-white print:text-black">
                  <th className="px-3 py-2 font-medium">Ingredient</th>
                  <th className="px-3 py-2 font-medium">Ordered</th>
                  <th className="px-3 py-2 font-medium">Received</th>
                  <th className="px-3 py-2 font-medium">Damage/Short</th>
                  <th className="px-3 py-2 font-medium">Expiry</th>
                  <th className="px-3 py-2 font-medium">Remark</th>
                </tr>
              </thead>
              <tbody>
                {gatePass.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 print:border-black">
                    <td className="px-3 py-2">{item.stockItem.name}</td>
                    <td className="px-3 py-2">{orderedQtyByStockItem.get(item.stockItemId) ?? '—'}</td>
                    <td className="px-3 py-2">{item.receivedQty}</td>
                    <td className="px-3 py-2">{item.damageQty}</td>
                    <td className="px-3 py-2">{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                    <td className="px-3 py-2">{item.remark ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
