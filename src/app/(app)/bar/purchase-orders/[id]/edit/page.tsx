'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type BarProduct, type BarVendor } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

interface OrderLine {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

export default function EditPurchaseOrderPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [suppliers, setSuppliers] = useState<BarVendor[]>([]);
  const [products, setProducts] = useState<BarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [poReference, setPoReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [stagingProductId, setStagingProductId] = useState('');
  const [stagingUnitPrice, setStagingUnitPrice] = useState('');
  const [stagingQty, setStagingQty] = useState('');
  const [stagingDiscount, setStagingDiscount] = useState('');

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const [po, supplierList, productList] = await Promise.all([
        api.getBarPurchaseOrder(params.id),
        api.listBarVendors(),
        api.listBarProducts(),
      ]);
      if (po.status !== 'OPEN') {
        setError(`Cannot edit a purchase order that is already ${po.status}`);
        return;
      }
      setPoReference(po.poReference ?? `PO-${String(po.poNo).padStart(5, '0')}`);
      setSupplierId(po.vendorId);
      setRemark(po.remark ?? '');
      setLines(
        po.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          unitPrice: Number(item.unitCost),
          quantity: item.orderedQty,
          discount: Number(item.discount),
        })),
      );
      setSuppliers(supplierList);
      setProducts(productList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load purchase order');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function handleStagingProductChange(productId: string) {
    setStagingProductId(productId);
    const product = productById.get(productId);
    if (product && !stagingUnitPrice) {
      setStagingUnitPrice(product.unitPrice);
    }
  }

  function addLine() {
    const product = productById.get(stagingProductId);
    const quantity = Number(stagingQty);
    const unitPrice = Number(stagingUnitPrice);
    if (!product || !quantity || quantity <= 0) {
      setError('Select a product and quantity');
      return;
    }
    setError(null);
    setLines((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, unitPrice, quantity, discount: Number(stagingDiscount) || 0 },
    ]);
    setStagingProductId('');
    setStagingUnitPrice('');
    setStagingQty('');
    setStagingDiscount('');
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const totalDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
  const grandTotal = subtotal - totalDiscount;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!supplierId) {
      setError('Select a supplier');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one product line');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.updateBarPurchaseOrder(params.id, {
        vendorId: supplierId,
        remark: remark || undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          orderedQty: line.quantity,
          unitCost: line.unitPrice,
          discount: line.discount || undefined,
        })),
      });
      router.push(`/bar/purchase-orders/${params.id}`);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update purchase order');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Bar · Purchase Order</p>
          <h1 className="text-2xl font-semibold">Edit Purchase Order {poReference && `— ${poReference}`}</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Supplier <span className="text-red-400">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full max-w-sm rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Products</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Product</label>
                  <select
                    value={stagingProductId}
                    onChange={(e) => handleStagingProductChange(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Unit Price</label>
                  <input
                    type="number"
                    placeholder="Ex: 1800"
                    value={stagingUnitPrice}
                    onChange={(e) => setStagingUnitPrice(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Quantity</label>
                  <input
                    type="number"
                    placeholder="Ex: 10"
                    value={stagingQty}
                    onChange={(e) => setStagingQty(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Discount</label>
                  <input
                    type="number"
                    placeholder="Ex: 10"
                    value={stagingDiscount}
                    onChange={(e) => setStagingDiscount(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                    min={0}
                    step="0.01"
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
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Unit Price</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                    <th className="px-3 py-2 font-medium">Discount</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        No products added yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={index} className="border-t border-slate-800 text-slate-200">
                        <td className="px-3 py-2">{line.productName}</td>
                        <td className="px-3 py-2">Rs. {line.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2">{line.quantity}</td>
                        <td className="px-3 py-2">Rs. {line.discount.toFixed(2)}</td>
                        <td className="px-3 py-2">Rs. {(line.unitPrice * line.quantity - line.discount).toFixed(2)}</td>
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

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-200">Subtotal</label>
                  <input
                    value={subtotal.toFixed(2)}
                    readOnly
                    className="w-32 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-right text-sm text-slate-300"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-200">Total Discount</label>
                  <input
                    value={totalDiscount.toFixed(2)}
                    readOnly
                    className="w-32 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-right text-sm text-slate-300"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-100">Grand Total</label>
                  <input
                    value={grandTotal.toFixed(2)}
                    readOnly
                    className="w-32 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-right text-sm font-semibold text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Update Record'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/bar/purchase-orders/${params.id}`)}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
