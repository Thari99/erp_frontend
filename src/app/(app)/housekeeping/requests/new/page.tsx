'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type HousekeepingRequest,
  type HousekeepingStatusRow,
  type InventoryItem,
  type ResourceType,
} from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

interface RequestLine {
  itemId: string;
  itemName: string;
  quantity: number;
  stockQty: number;
}

export default function NewHousekeepingRequestPage() {
  const requireLogin = useRequireLogin();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<HousekeepingStatusRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<HousekeepingRequest | null>(null);

  const [requestedFor, setRequestedFor] = useState<ResourceType>('ROOM');
  const [resourceId, setResourceId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [stagingItemId, setStagingItemId] = useState('');
  const [stagingQty, setStagingQty] = useState('');

  const load = useCallback(async () => {
    try {
      // The status board doubles as the location list — it already returns every active
      // room/hall/boardroom, so there's no need for a second resource endpoint here.
      const [inventoryItems, statusRows] = await Promise.all([
        api.listInventoryItems(),
        api.listHousekeepingStatuses(),
      ]);
      setItems(inventoryItems.filter((item) => item.isActive));
      setLocations(statusRows);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // Only locations of the chosen type are selectable — the API rejects a mismatch, so
  // filtering here keeps the user from hitting that error at all.
  const selectableLocations = useMemo(
    () => locations.filter((location) => location.type === requestedFor),
    [locations, requestedFor],
  );

  function addLine() {
    const item = itemById.get(stagingItemId);
    const quantity = Number(stagingQty);
    if (!item || !quantity || quantity <= 0) {
      setError('Select an item and quantity');
      return;
    }
    if (lines.some((line) => line.itemId === item.id)) {
      setError(`"${item.name}" is already on this request — remove it first to change the quantity`);
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
    if (lines.length === 0) {
      setError('Add at least one item');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const request = await api.createHousekeepingRequest({
        requestedFor,
        resourceId: resourceId || undefined,
        note: note.trim() || undefined,
        items: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      });
      setCreated(request);
      setLines([]);
      setResourceId('');
      setNote('');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to create request');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Housekeeping · Requests</p>
          <h1 className="text-2xl font-semibold">Request Supplies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ask for inventory items for a room, hall, or boardroom. Stock is only deducted once the request is approved
            and issued.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {created && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Request <span className="font-semibold">{created.requestReference ?? `#${created.requestNo}`}</span> created.{' '}
            <Link href="/housekeeping/requests" className="underline hover:text-emerald-200">
              Manage requests
            </Link>
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active inventory items. Add them under Inventory → Items before raising a request.
          </p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Requested for <span className="text-red-400">*</span>
                </label>
                <select
                  value={requestedFor}
                  onChange={(e) => {
                    setRequestedFor(e.target.value as ResourceType);
                    // The previously chosen location belongs to the old type, so drop it.
                    setResourceId('');
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="ROOM">Rooms</option>
                  <option value="HALL">Hall</option>
                  <option value="BOARDROOM">Boardroom</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Specific location (optional)</label>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">Not specific</option>
                  {selectableLocations.map((location) => (
                    <option key={location.resourceId} value={location.resourceId}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
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
                    <th className="px-3 py-2 font-medium">In stock</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No items added yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={line.itemId} className="border-t border-slate-800 text-slate-200">
                        <td className="px-3 py-2">{line.itemName}</td>
                        <td className="px-3 py-2">{line.quantity}</td>
                        <td className="px-3 py-2">
                          <span className={line.quantity > line.stockQty ? 'text-amber-400' : 'text-slate-400'}>
                            {line.stockQty}
                            {line.quantity > line.stockQty ? ' — short' : ''}
                          </span>
                        </td>
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

            {lines.some((line) => line.quantity > line.stockQty) && (
              <p className="text-xs text-amber-400">
                Some quantities exceed current stock. The request can still be raised — stock is only checked when it is
                issued, by which time a delivery may have arrived.
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs text-slate-400">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Sending…' : 'Send Request'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
