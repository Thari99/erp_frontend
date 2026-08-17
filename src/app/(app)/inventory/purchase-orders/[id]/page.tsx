'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

export default function InventoryPurchaseOrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <InventoryPurchaseOrderDetailPageContent />
    </Suspense>
  );
}

function InventoryPurchaseOrderDetailPageContent() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === '1';
  const hasAutoPrinted = useRef(false);

  const [po, setPo] = useState<InventoryPurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getInventoryPurchaseOrder(params.id)
      .then(setPo)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load purchase order');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, requireLogin]);

  useEffect(() => {
    if (autoprint && po && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoprint, po]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !po) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>{error ?? 'Purchase order not found'}</p>
      </main>
    );
  }

  const subtotal = po.items.reduce((sum, item) => sum + Number(item.unitCost) * item.orderedQty, 0);
  const totalDiscount = po.items.reduce((sum, item) => sum + Number(item.discount), 0);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50 print:bg-white print:px-0 print:text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back
          </button>
          <div className="flex gap-2">
            {po.status === 'OPEN' && (
              <Link
                href={`/inventory/purchase-orders/${po.id}/edit`}
                className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              >
                Edit
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Print
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 print:border-black print:bg-white">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-400 print:text-black">Purchase Order</p>
              <h1 className="text-2xl font-semibold">{po.poReference ?? `PO-${String(po.poNo).padStart(5, '0')}`}</h1>
            </div>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-300 print:text-black">
              <span className={`h-2 w-2 flex-none rounded-full ${STATUS_DOT[po.status]}`} />
              {po.status}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Supplier: </span>
              {po.vendor.name}
              {po.vendor.phone && <span className="text-slate-500"> · {po.vendor.phone}</span>}
            </p>
            <p>
              <span className="text-slate-500">Date: </span>
              {formatDateTime(po.createdAt)}
            </p>
            <p>
              <span className="text-slate-500">Created by: </span>
              {po.createdBy}
            </p>
            {po.gatePass && (
              <p>
                <span className="text-slate-500">Received: </span>
                {po.gatePass.gatePassReference ?? `GP-${String(po.gatePass.gatePassNo).padStart(5, '0')}`} by {po.gatePass.receivedBy},{' '}
                {formatDateTime(po.gatePass.receivedAt)}
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded border border-slate-800 print:border-black">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500 print:bg-white print:text-black">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Unit Price</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 print:border-black">
                    <td className="px-3 py-2">{item.item.name}</td>
                    <td className="px-3 py-2">Rs. {Number(item.unitCost).toFixed(2)}</td>
                    <td className="px-3 py-2">{item.orderedQty}</td>
                    <td className="px-3 py-2">Rs. {Number(item.discount).toFixed(2)}</td>
                    <td className="px-3 py-2">Rs. {Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.remark && (
            <p className="mt-4 text-sm text-slate-400">
              <span className="text-slate-500">Remark: </span>
              {po.remark}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Discount</span>
                <span>Rs. {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Grand Total</span>
                <span>Rs. {Number(po.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
