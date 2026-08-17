'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type VendorBill, type VendorPaymentMethod } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_LABEL: Record<VendorBill['status'], string> = {
  OPEN: 'Open',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
};

export default function ManageVendorBillsPage() {
  return (
    <Suspense fallback={null}>
      <ManageVendorBillsPageContent />
    </Suspense>
  );
}

function ManageVendorBillsPageContent() {
  const requireLogin = useRequireLogin();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [bills, setBills] = useState<VendorBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<VendorPaymentMethod>('CASH');
  const [payDescription, setPayDescription] = useState('');

  const load = useCallback(async () => {
    try {
      setBills(await api.listVendorBills());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load vendor bills');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function startPay(bill: VendorBill) {
    setPayingId(bill.id);
    setPayAmount(Number(bill.balance).toFixed(2));
    setPayMethod('CASH');
    setPayDescription('');
  }

  async function submitPay(event: React.FormEvent, billId: string) {
    event.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    setBusyId(billId);
    setError(null);
    try {
      await api.recordVendorBillPayment(billId, { amount, method: payMethod, description: payDescription.trim() || undefined });
      setPayingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Accounting · Vendor Bills</p>
            <h1 className="text-2xl font-semibold">Manage Vendor Bills</h1>
          </div>
          <Link href="/accounting/vendor-bills/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Record Bill
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Bill Ref</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Balance</th>
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
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No vendor bills yet —{' '}
                    <Link href="/accounting/vendor-bills/new" className="text-emerald-400 underline">
                      record one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className={`border-t border-slate-800 text-slate-200 ${highlightId === bill.id ? 'bg-emerald-950/30' : 'hover:bg-slate-800/60'}`}
                  >
                    {payingId === bill.id ? (
                      <td colSpan={7} className="px-4 py-3">
                        <form onSubmit={(e) => submitPay(e, bill.id)} className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">Paying {bill.vendor.name} —</span>
                          <input
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            min={0.01}
                            max={Number(bill.balance)}
                            step="0.01"
                            className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                            autoFocus
                            required
                          />
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as VendorPaymentMethod)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          >
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                          <input
                            placeholder="Description (optional)"
                            value={payDescription}
                            onChange={(e) => setPayDescription(e.target.value)}
                            className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={busyId === bill.id}
                            className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Pay
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayingId(null)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{bill.billReference ?? `VB-${bill.billNo}`}</td>
                        <td className="px-4 py-3">{formatDateTime(bill.createdAt)}</td>
                        <td className="px-4 py-3">{bill.vendor.name}</td>
                        <td className="px-4 py-3">Rs. {Number(bill.amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={Number(bill.balance) > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            Rs. {Number(bill.balance).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                              bill.status === 'PAID' ? 'text-slate-500' : bill.status === 'PARTIALLY_PAID' ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 flex-none rounded-full ${
                                bill.status === 'PAID' ? 'bg-slate-600' : bill.status === 'PARTIALLY_PAID' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            {STATUS_LABEL[bill.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {bill.status !== 'PAID' && (
                            <button
                              onClick={() => startPay(bill)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </>
                    )}
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
