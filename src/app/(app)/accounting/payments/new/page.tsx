'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ChartOfAccount } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

type Method = 'CASH' | 'CARD' | 'BANK_TRANSFER';

// Same control accounts every POS/booking checkout settles against — offered as a
// default for the chosen method, but the account pickers below stay fully editable.
const DEBIT_ACCOUNT_BY_METHOD: Record<Method, string> = {
  CASH: '1000',
  CARD: '4000',
  BANK_TRANSFER: '1010',
};

export default function RecordPaymentPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<Method>('CASH');
  const [debitAccountCode, setDebitAccountCode] = useState('');
  const [creditAccountCode, setCreditAccountCode] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const accountList = await api.listAccounts();
      setAccounts(accountList.filter((a) => a.isActive));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load chart of accounts');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function handleMethodChange(next: Method) {
    setMethod(next);
    if (!debitAccountCode) setDebitAccountCode(DEBIT_ACCOUNT_BY_METHOD[next]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payment = await api.recordPayment({
        reference: reference.trim(),
        amount: Number(amount),
        method,
        debitAccountCode,
        creditAccountCode,
        description: description.trim() || undefined,
      });
      router.push(`/accounting/payments?highlight=${payment.id}`);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Payments</p>
          <h1 className="text-2xl font-semibold">Record Payment</h1>
          <p className="mt-1 text-sm text-slate-500">
            For income or expenses not tied to a specific sale, booking, or member account — e.g. paying a utility bill or
            recording miscellaneous income.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No accounts yet — create one under Accounting → Chart of Accounts first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Method</label>
              <div className="flex gap-2">
                {(['CASH', 'CARD', 'BANK_TRANSFER'] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMethodChange(m)}
                    className={`flex-1 rounded border px-3 py-2 text-sm ${
                      method === m ? 'border-emerald-500 bg-emerald-950 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'Bank Transfer'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Debit Account <span className="text-red-400">*</span>
                </label>
                <select
                  value={debitAccountCode}
                  onChange={(e) => setDebitAccountCode(e.target.value)}
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
                <p className="mt-1 text-xs text-slate-500">Where the value increases — an expense account, or Cash/Bank if this is income.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Credit Account <span className="text-red-400">*</span>
                </label>
                <select
                  value={creditAccountCode}
                  onChange={(e) => setCreditAccountCode(e.target.value)}
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
                <p className="mt-1 text-xs text-slate-500">Where the value comes from — Cash/Bank if this is an expense, or an income account.</p>
              </div>
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
              <label className="mb-1 block text-xs text-slate-400">
                Reference <span className="text-red-400">*</span>
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. RENT-AUG-2026"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
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
              {isSaving ? 'Recording…' : 'Record Payment'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
