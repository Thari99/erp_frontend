'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PhysicalAsset, type PhysicalAssetCategory } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

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

export default function NewAssetPage() {
  const requireLogin = useRequireLogin();
  const [categories, setCategories] = useState<PhysicalAssetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PhysicalAsset | null>(null);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [sourceOfPurchase, setSourceOfPurchase] = useState('');
  const [depreciationPerYear, setDepreciationPerYear] = useState('');
  const [location, setLocation] = useState('');
  const [remark, setRemark] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await api.listAssetCategories());
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
    setSaved(null);
    setIsSaving(true);
    try {
      const asset = await api.createAsset({
        name,
        categoryId: categoryId || undefined,
        buyingPrice: buyingPrice ? Number(buyingPrice) : undefined,
        purchaseDate: purchaseDate || undefined,
        sourceOfPurchase: sourceOfPurchase || undefined,
        depreciationPerYear: depreciationPerYear ? Number(depreciationPerYear) : undefined,
        location: location || undefined,
        remark: remark || undefined,
        quantity: quantity ? Number(quantity) : undefined,
      });
      setCategoryId('');
      setName('');
      setBuyingPrice('');
      setPurchaseDate('');
      setSourceOfPurchase('');
      setDepreciationPerYear('');
      setLocation('');
      setRemark('');
      setQuantity('1');
      setSaved(asset);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add asset');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Inventory · Physical Stock</p>
          <h1 className="text-2xl font-semibold">New Asset</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register a purchase — each unit gets its own trackable tag code automatically.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Asset added — <span className="font-semibold">{saved.assetReference}</span> ({saved.units.length} unit
            {saved.units.length === 1 ? '' : 's'}).
          </p>
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

            <Field label="Asset Name" required>
              <input
                placeholder="e.g. Office Chair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Quantity" required>
              <input
                type="number"
                placeholder="e.g. 3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                min={1}
                required
              />
            </Field>

            <Field label="Buying Price">
              <input
                type="number"
                placeholder="e.g. 15000"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Purchase Date">
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Source of Purchase">
              <input
                placeholder="e.g. Office Mart"
                value={sourceOfPurchase}
                onChange={(e) => setSourceOfPurchase(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Depreciation / Year">
              <input
                type="number"
                placeholder="e.g. 1500"
                value={depreciationPerYear}
                onChange={(e) => setDepreciationPerYear(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Location">
              <input
                placeholder="e.g. Main Office"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Remark">
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className={inputClass} />
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
