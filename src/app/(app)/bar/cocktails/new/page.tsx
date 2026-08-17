'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type BarBrand, type BarCategory, type BarProduct, type BarUnit } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';
import { CocktailIngredientEditor, toIngredientPayload, type IngredientRow } from '@/components/CocktailIngredientEditor';

export default function CreateCocktailPage() {
  const requireLogin = useRequireLogin();
  const [products, setProducts] = useState<BarProduct[]>([]);
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [brands, setBrands] = useState<BarBrand[]>([]);
  const [units, setUnits] = useState<BarUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [rows, setRows] = useState<IngredientRow[]>([{ productId: '', quantity: '1', unitId: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [productList, categoryList, brandList, unitList] = await Promise.all([
        api.listBarProducts(),
        api.listBarCategories(),
        api.listBarBrands(),
        api.listBarUnits(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
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

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(await readFileAsDataUrl(file));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const ingredients = toIngredientPayload(rows);
    if (!categoryId) {
      setError('Select a category');
      return;
    }
    if (ingredients.length === 0) {
      setError('Add at least one ingredient');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.createBarCocktail({
        name,
        categoryId,
        brandId: brandId || undefined,
        photo: photo || undefined,
        unitPrice: Number(unitPrice),
        isActive: status === 'ACTIVE',
        ingredients,
      });
      setCategoryId('');
      setBrandId('');
      setPhoto(null);
      setName('');
      setUnitPrice('');
      setStatus('ACTIVE');
      setRows([{ productId: '', quantity: '1', unitId: '' }]);
      setSaved(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add cocktail');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Bar · Cocktails</p>
          <h1 className="text-2xl font-semibold">Create Cocktails</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Cocktail added.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              >
                <option value="">~~ Select Category ~~</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Brand</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Image</label>
              <div className="flex items-center gap-3">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-12 w-12 rounded border border-slate-700 object-cover" />
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                placeholder="e.g. Mojito"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Price <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                min={0}
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Status <span className="text-red-400">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Ingredients</label>
              <CocktailIngredientEditor rows={rows} products={products} units={units} onChange={setRows} />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Creating…' : 'Create Cocktails'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
