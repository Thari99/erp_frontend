'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type InventoryCategory, type InventoryVendor } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[180px_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium text-slate-200">
        {label}:{required && <span className="text-red-400"> *</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

const inputClass = 'w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm';

export default function NewInventoryItemPage() {
  const requireLogin = useRequireLogin();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [categoryList, vendorList] = await Promise.all([api.listInventoryCategories(), api.listInventoryVendors()]);
      setCategories(categoryList);
      setVendors(vendorList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadPhotoFile(file: File | undefined) {
    if (!file) return;
    setPhoto(await readFileAsDataUrl(file));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await api.createInventoryItem({
        name,
        categoryId: categoryId || undefined,
        vendorId: vendorId || undefined,
        photo: photo || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        stockQty: stockQty ? Number(stockQty) : undefined,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      });
      setCategoryId('');
      setVendorId('');
      setName('');
      setPhoto(null);
      setPurchasePrice('');
      setStockQty('');
      setReorderLevel('');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add item');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Inventory · Items</p>
          <h1 className="text-2xl font-semibold">New Item</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Item added.</p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <Field label="Category">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supplier">
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
                <option value="">Select Supplier</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Item Name" required>
              <input
                placeholder="e.g. A4 Paper Ream"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Item Image">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(false);
                  loadPhotoFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center text-sm text-slate-400 ${
                  isDraggingPhoto ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-700'
                }`}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-20 w-20 rounded object-cover" />
                ) : (
                  <>
                    <span aria-hidden>⬆️</span>
                    <span>Drag and drop image here or click to upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => loadPhotoFile(e.target.files?.[0])} />
              </label>
            </Field>

            <Field label="Purchase Price">
              <input
                type="number"
                placeholder="e.g. 650"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                placeholder="e.g. 10"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className={inputClass}
                min={0}
              />
            </Field>

            <Field label="Reorder Level">
              <input
                type="number"
                placeholder="e.g. 5"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className={inputClass}
                min={0}
              />
            </Field>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Records'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
