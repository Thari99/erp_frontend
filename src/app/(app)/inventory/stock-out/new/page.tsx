'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type InventoryItem, type InventoryStockOut } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

interface IssueLine {
  itemId: string;
  itemName: string;
  quantity: number;
  stockQty: number;
}

export default function NewInventoryStockOutPage() {
  const requireLogin = useRequireLogin();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdIssue, setCreatedIssue] = useState<InventoryStockOut | null>(null);

  const [issuedTo, setIssuedTo] = useState('');
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<IssueLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [stagingItemId, setStagingItemId] = useState('');
  const [stagingQty, setStagingQty] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api.listInventoryItems());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function addLine() {
    const item = itemById.get(stagingItemId);
    const quantity = Number(stagingQty);
    if (!item || !quantity || quantity <= 0) {
      setError('Select an item and quantity');
      return;
    }
    if (quantity > item.stockQty) {
      setError(`Only ${item.stockQty} of "${item.name}" in stock`);
      return;
    }
    setError(null);
    setLines((prev) => [...prev, { itemId: item.id, itemName: item.name, quantity, stockQty: item.stockQty }]);
    setStagingItemId('');
    setStagingQty('');
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!issuedTo.trim()) {
      setError('Enter who this is issued to');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one item line');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const issue = await api.createInventoryStockOut({
        issuedTo: issuedTo.trim(),
        remark: remark || undefined,
        items: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      });
      setLines([]);
      setIssuedTo('');
      setRemark('');
      setCreatedIssue(issue);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to issue stock');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Inventory · Stock Out</p>
          <h1 className="text-2xl font-semibold">Issue Stock</h1>
          <p className="mt-1 text-sm text-slate-500">Issue supplies to a staff member or department — deducts stock immediately.</p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {createdIssue && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Stock issued — <span className="font-semibold">{createdIssue.issueReference}</span>.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Issued To <span className="text-red-400">*</span>
              </label>
              <input
                placeholder="e.g. Front Office"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                className="w-full max-w-sm rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Items</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Item</label>
                  <select
                    value={stagingItemId}
                    onChange={(e) => setStagingItemId(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.stockQty} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Quantity</label>
                  <input
                    type="number"
                    placeholder="Ex: 5"
                    value={stagingQty}
                    onChange={(e) => setStagingQty(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  className="self-end rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  +
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                        No items added yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={index} className="border-t border-slate-800 text-slate-200">
                        <td className="px-3 py-2">{line.itemName}</td>
                        <td className="px-3 py-2">{line.quantity}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Remark (optional)</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Issuing…' : 'Issue Stock'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
