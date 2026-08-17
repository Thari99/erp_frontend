'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type Payment } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ManagePaymentsPage() {
  return (
    <Suspense fallback={null}>
      <ManagePaymentsPageContent />
    </Suspense>
  );
}

function ManagePaymentsPageContent() {
  const requireLogin = useRequireLogin();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPayments(await api.listPayments());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Accounting · Payments</p>
            <h1 className="text-2xl font-semibold">Manage Payments</h1>
          </div>
          <Link href="/accounting/payments/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Record Payment
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Payment #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Debit / Credit</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const debitLine = payment.journalEntry?.lines.find((l) => Number(l.debit) > 0);
                  const creditLine = payment.journalEntry?.lines.find((l) => Number(l.credit) > 0);
                  return (
                    <tr
                      key={payment.id}
                      className={`border-t border-slate-800 text-slate-200 ${highlightId === payment.id ? 'bg-emerald-950/30' : 'hover:bg-slate-800/60'}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">PAY-{String(payment.paymentNo).padStart(5, '0')}</td>
                      <td className="px-4 py-3">{formatDateTime(payment.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{payment.reference}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {debitLine ? `${debitLine.account.code} ${debitLine.account.name}` : '—'}
                        <br />
                        {creditLine ? `${creditLine.account.code} ${creditLine.account.name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{payment.method === 'MEMBER_CREDIT' ? 'Member A/C' : payment.method}</td>
                      <td className="px-4 py-3">Rs. {Number(payment.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                            payment.status === 'REVERSED' ? 'text-red-400' : 'text-slate-300'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${payment.status === 'REVERSED' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {payment.status === 'REVERSED' ? 'Reversed' : 'Recorded'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
