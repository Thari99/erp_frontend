'use client';

import { useState } from 'react';
import { api, ApiError, type AccountType, type NormalBalance } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// The normal balance is implied by the account type in standard bookkeeping — offered
// as a sane default here, but left editable since a few real accounts (e.g. a contra
// account) legitimately run the other way.
const DEFAULT_NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
  EXPENSE: 'DEBIT',
};

export default function CreateChartOfAccountPage() {
  const requireLogin = useRequireLogin();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ASSET');
  const [normalBalance, setNormalBalance] = useState<NormalBalance>('DEBIT');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleTypeChange(next: AccountType) {
    setType(next);
    setNormalBalance(DEFAULT_NORMAL_BALANCE[next]);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await api.createAccount({ code: code.trim(), name: name.trim(), type, normalBalance });
      setCode('');
      setName('');
      setType('ASSET');
      setNormalBalance('DEBIT');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add account');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Accounting · Chart of Accounts</p>
          <h1 className="text-2xl font-semibold">Create Account</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Account added.</p>}

        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Code</label>
            <input
              placeholder="e.g. 5100"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Account Name</label>
            <input
              placeholder="e.g. Office Rent Expense"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as AccountType)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Normal Balance</label>
            <select
              value={normalBalance}
              onChange={(e) => setNormalBalance(e.target.value as NormalBalance)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Adding…' : 'Add Account'}
          </button>
        </form>
      </div>
    </main>
  );
}
