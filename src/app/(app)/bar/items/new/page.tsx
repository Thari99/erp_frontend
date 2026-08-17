'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type BarBrand, type BarCategory, type BarUnit, type BarVendor } from '@/lib/api';
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

export default function NewProductPage() {
  const requireLogin = useRequireLogin();
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [vendors, setVendors] = useState<BarVendor[]>([]);
  const [brands, setBrands] = useState<BarBrand[]>([]);
  const [units, setUnits] = useState<BarUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [unitId, setUnitId] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [categoryList, vendorList, brandList, unitList] = await Promise.all([
        api.listBarCategories(),
        api.listBarVendors(),
        api.listBarBrands(),
        api.listBarUnits(),
      ]);
      setCategories(categoryList);
      setVendors(vendorList);
      setBrands(brandList);
      setUnits(unitList);
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
      await api.createBarProduct({
        name,
        categoryId,
        brandId,
        vendorId,
        unitId: unitId || undefined,
        photo: photo || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        unitPrice: Number(unitPrice),
        expiryDate: expiryDate || undefined,
        stockQty: stockQty ? Number(stockQty) : undefined,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      });
      setCategoryId('');
      setVendorId('');
      setBrandId('');
      setName('');
      setPhoto(null);
      setExpiryDate('');
      setPurchasePrice('');
      setUnitPrice('');
      setStockQty('');
      setUnitId('');
      setReorderLevel('');
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add product');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Bar · Stock</p>
          <h1 className="text-2xl font-semibold">New Product</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Product added.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <Field label="Category" required>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass} required>
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vendor" required>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass} required>
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Brand" required>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputClass} required>
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Product Name" required>
              <input
                placeholder="e.g. Premium Whiskey"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Liquor Image">
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => loadPhotoFile(e.target.files?.[0])}
                />
              </label>
            </Field>

            <Field label="Expiry Date">
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Purchase Price">
              <input
                type="number"
                placeholder="e.g. 49.99"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Selling Price">
              <input
                type="number"
                placeholder="e.g. 59.99"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
                required
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

            <Field label="Unit">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
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
