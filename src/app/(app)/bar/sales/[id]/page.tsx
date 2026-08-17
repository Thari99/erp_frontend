'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, type BarSale } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_LABEL: Record<string, string> = { HELD: 'Held', COMPLETED: 'Completed' };

export default function SaleReceiptPage() {
  return (
    <Suspense fallback={null}>
      <SaleReceiptPageContent />
    </Suspense>
  );
}

function SaleReceiptPageContent() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === '1';
  const hasAutoPrinted = useRef(false);

  const [sale, setSale] = useState<BarSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getBarSale(params.id)
      .then(setSale)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load sale');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, requireLogin]);

  useEffect(() => {
    if (autoprint && sale && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoprint, sale]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>{error ?? 'Sale not found'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50 print:bg-white print:px-0 print:text-black">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Print
          </button>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 print:border-black print:bg-white">
          <div className="mb-4 text-center">
            <p className="text-sm text-emerald-400 print:text-black">Bar Receipt</p>
            <h1 className="text-xl font-semibold">{sale.saleReference ?? `#${sale.saleNo}`}</h1>
            {sale.voidedAt ? (
              <p className="mt-1 text-xs font-medium text-red-500">VOIDED</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500 print:text-slate-700">{STATUS_LABEL[sale.status]}</p>
            )}
          </div>

          <div className="mb-4 space-y-1 text-xs text-slate-400 print:text-slate-700">
            <p>Date: {formatDateTime(sale.completedAt ?? sale.createdAt)}</p>
            {sale.soldBy && <p>Served by: {sale.soldBy}</p>}
            <p>
              Guest:{' '}
              {sale.guestType === 'MEMBER'
                ? sale.member
                  ? `${sale.member.memberNo} ${sale.member.title ? `${sale.member.title} ` : ''}${sale.member.fullName}`
                  : 'Member'
                : sale.guestType === 'CLUB'
                  ? 'Club Use (Complimentary)'
                  : sale.guestName || 'Walk-in'}
            </p>
            {sale.paymentMethod && <p>Payment: {sale.paymentMethod === 'MEMBER' ? 'Charged to Member Account' : sale.paymentMethod}</p>}
          </div>

          <div className="border-t border-slate-800 py-3 print:border-black">
            {sale.items.map((item) => (
              <div key={item.id} className="mb-1 flex justify-between text-sm">
                <span className="text-slate-200">
                  {item.quantity} × {item.product.name}
                </span>
                <span>Rs. {Number(item.total).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-3 text-sm print:border-black">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>Rs. {Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.serviceChargeAmount) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Service Charge ({Number(sale.serviceChargePercent).toFixed(2)}%)</span>
                <span>Rs. {Number(sale.serviceChargeAmount).toFixed(2)}</span>
              </div>
            )}
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Discount</span>
                <span>Rs. {Number(sale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-slate-100">
              <span>Net Amount</span>
              <span>Rs. {Number(sale.total).toFixed(2)}</span>
            </div>
            {sale.guestType !== 'CLUB' && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Payment</span>
                  <span>Rs. {Number(sale.payment).toFixed(2)}</span>
                </div>
                {Number(sale.balance) !== 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>{Number(sale.balance) < 0 ? 'Change Due' : 'Balance'}</span>
                    <span>Rs. {Math.abs(Number(sale.balance)).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {sale.remarks && (
            <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500 print:border-black">Remarks: {sale.remarks}</p>
          )}
        </div>
      </div>
    </main>
  );
}
