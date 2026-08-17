'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type FoodIngredientCategory, type FoodVendor } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium text-slate-200">
        {label}:{required && <span className="text-red-400"> *</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

const inputClass = 'w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm';

export default function NewFoodStockItemPage() {
  const requireLogin = useRequireLogin();
  const [categories, setCategories] = useState<FoodIngredientCategory[]>([]);
  const [vendors, setVendors] = useState<FoodVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [categoryList, vendorList] = await Promise.all([api.listFoodIngredientCategories(), api.listFoodVendors()]);
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

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await api.createFoodStockItem({
        name,
        categoryId: categoryId || undefined,
        vendorId: vendorId || undefined,
        unit: unit || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        expiryDate: expiryDate || undefined,
        stockQty: stockQty ? Number(stockQty) : undefined,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      });
      setCategoryId('');
      setVendorId('');
      setName('');
      setUnit('');
      setPurchasePrice('');
      setExpiryDate('');
      setStockQty('');
      setReorderLevel('');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add ingredient');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Food · Ingredient Stock</p>
          <h1 className="text-2xl font-semibold">New Ingredient</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Ingredient added.</p>}

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

            <Field label="Ingredient Name" required>
              <input placeholder="e.g. Basmati Rice" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
            </Field>

            <Field label="Unit">
              <input placeholder="e.g. kg, liter, packet" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Purchase Price">
              <input
                type="number"
                placeholder="e.g. 250.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Expiry Date">
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Opening Stock">
              <input
                type="number"
                placeholder="e.g. 50"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className={inputClass}
                min={0}
              />
            </Field>

            <Field label="Reorder Level">
              <input
                type="number"
                placeholder="e.g. 10"
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
              {isSaving ? 'Saving…' : 'Save Ingredient'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
