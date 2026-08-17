'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type ChartOfAccount, type PayableVendor } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

export default function CreateVendorBillPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [vendors, setVendors] = useState<PayableVendor[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [expenseAccountCode, setExpenseAccountCode] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [vendorList, accountList] = await Promise.all([api.listPayableVendors(), api.listAccounts()]);
      setVendors(vendorList.filter((v) => v.isActive));
      setAccounts(accountList.filter((a) => a.isActive));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load vendors/accounts');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const bill = await api.createVendorBill({
        vendorId,
        expenseAccountCode,
        amount: Number(amount),
        description: description.trim() || undefined,
      });
      router.push(`/accounting/vendor-bills?highlight=${bill.id}`);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create bill');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Vendor Bills</p>
          <h1 className="text-2xl font-semibold">Record Vendor Bill</h1>
          <p className="mt-1 text-sm text-slate-500">
            Records a liability the moment it's incurred — the vendor's balance increases now, and you settle it later with a payment.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active vendors yet —{' '}
            <Link href="/accounting/payable-vendors/new" className="text-emerald-400 underline">
              create one
            </Link>{' '}
            first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Vendor <span className="text-red-400">*</span>
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Expense / Debit Account <span className="text-red-400">*</span>
              </label>
              <select
                value={expenseAccountCode}
                onChange={(e) => setExpenseAccountCode(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">What this bill is for — e.g. an inventory or expense account.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Amount <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0.01}
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Recording…' : 'Record Bill'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
