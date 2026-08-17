'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type BarBrand, type BarCategory, type BarProduct, type BarUnit, type Cocktail } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';
import { CocktailIngredientEditor, toIngredientPayload, type IngredientRow } from '@/components/CocktailIngredientEditor';

export default function ManageCocktailsPage() {
  const requireLogin = useRequireLogin();
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [products, setProducts] = useState<BarProduct[]>([]);
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [brands, setBrands] = useState<BarBrand[]>([]);
  const [units, setUnits] = useState<BarUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBrandId, setEditBrandId] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editRows, setEditRows] = useState<IngredientRow[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cocktailList, productList, categoryList, brandList, unitList] = await Promise.all([
        api.listBarCocktails(),
        api.listBarProducts(),
        api.listBarCategories(),
        api.listBarBrands(),
        api.listBarUnits(),
      ]);
      setCocktails(cocktailList);
      setProducts(productList);
      setCategories(categoryList);
      setBrands(brandList);
      setUnits(unitList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load cocktails');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(cocktail: Cocktail) {
    setEditingId(cocktail.id);
    setEditName(cocktail.name);
    setEditCategoryId(cocktail.categoryId ?? '');
    setEditBrandId(cocktail.brandId ?? '');
    setEditPhoto(cocktail.photo);
    setEditUnitPrice(cocktail.unitPrice);
    setEditStatus(cocktail.isActive ? 'ACTIVE' : 'INACTIVE');
    setEditRows(
      cocktail.cocktailIngredients.map((i) => ({
        productId: i.ingredientProductId,
        quantity: String(i.quantity),
        unitId: i.unitId ?? '',
      })),
    );
  }

  async function handleEditPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditPhoto(await readFileAsDataUrl(file));
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const ingredients = toIngredientPayload(editRows);
    if (ingredients.length === 0) {
      setError('Add at least one ingredient');
      return;
    }
    setError(null);
    setIsSavingEdit(true);
    try {
      await api.updateBarCocktail(editingId, {
        name: editName,
        categoryId: editCategoryId || undefined,
        brandId: editBrandId || undefined,
        photo: editPhoto || undefined,
        unitPrice: Number(editUnitPrice),
        isActive: editStatus === 'ACTIVE',
        ingredients,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update cocktail');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleActive(cocktail: Cocktail) {
    setError(null);
    try {
      await api.updateBarProduct(cocktail.id, { isActive: !cocktail.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update cocktail');
    }
  }

  async function handleDelete(cocktail: Cocktail) {
    if (!window.confirm(`Delete "${cocktail.name}"?`)) return;
    setError(null);
    try {
      await api.deleteBarProduct(cocktail.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete cocktail');
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Bar · Cocktails</p>
            <h1 className="text-2xl font-semibold">Manage Cocktails</h1>
          </div>
          <Link
            href="/bar/cocktails/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Create Cocktail
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Cocktails ({cocktails.length})</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : cocktails.length === 0 ? (
            <p className="text-sm text-slate-500">
              No cocktails yet —{' '}
              <Link href="/bar/cocktails/new" className="text-emerald-400 underline">
                create one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {cocktails.map((cocktail) => (
                <li key={cocktail.id} className="rounded border border-slate-800 bg-slate-950 p-4">
                  {editingId === cocktail.id ? (
                    <form onSubmit={submitEdit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm sm:col-span-2"
                          required
                        />
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                        >
                          <option value="">No category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={editUnitPrice}
                          onChange={(e) => setEditUnitPrice(e.target.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                          min={0}
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={editBrandId}
                          onChange={(e) => setEditBrandId(e.target.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                        >
                          <option value="">No brand</option>
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        {editPhoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={editPhoto} alt="" className="h-10 w-10 rounded border border-slate-700 object-cover" />
                        )}
                        <input type="file" accept="image/*" onChange={handleEditPhotoChange} className="text-sm" />
                      </div>
                      <CocktailIngredientEditor rows={editRows} products={products} units={units} onChange={setEditRows} />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingEdit}
                          className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          {cocktail.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cocktail.photo} alt="" className="h-10 w-10 rounded border border-slate-700 object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-700 bg-slate-800 text-[10px] text-slate-500">
                              No img
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {cocktail.name}
                              {cocktail.category && <span className="ml-2 text-xs text-slate-500">{cocktail.category.name}</span>}
                              {cocktail.brand && <span className="ml-2 text-xs text-slate-500">· {cocktail.brand.name}</span>}
                            </p>
                            <p className="text-xs text-slate-500">
                              Rs. {Number(cocktail.unitPrice).toFixed(2)} · can make {cocktail.stockQty} now
                            </p>
                            <span
                              className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${
                                cocktail.isActive ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 flex-none rounded-full ${cocktail.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                              {cocktail.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(cocktail)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(cocktail)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            {cocktail.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(cocktail)}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                        {cocktail.cocktailIngredients.map((ingredient) => (
                          <li key={ingredient.id}>
                            {ingredient.quantity} {ingredient.unit?.name ?? ''} × {ingredient.ingredientProduct.name}
                            <span className="ml-1">({ingredient.ingredientProduct.stockQty} on hand)</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
