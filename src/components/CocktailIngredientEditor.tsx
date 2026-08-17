'use client';

import type { BarProduct, BarUnit } from '@/lib/api';

export interface IngredientRow {
  productId: string;
  quantity: string;
  unitId: string;
}

export function toIngredientPayload(rows: IngredientRow[]) {
  return rows
    .filter((row) => row.productId && Number(row.quantity) > 0)
    .map((row) => ({ productId: row.productId, quantity: Number(row.quantity), unitId: row.unitId || undefined }));
}

export function CocktailIngredientEditor({
  rows,
  products,
  units,
  onChange,
}: {
  rows: IngredientRow[];
  products: BarProduct[];
  units: BarUnit[];
  onChange: (rows: IngredientRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<IngredientRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function addRow() {
    onChange([...rows, { productId: '', quantity: '1', unitId: '' }]);
  }

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="hidden gap-2 px-1 text-xs uppercase tracking-wide text-slate-500 sm:flex">
          <span className="flex-1">Product</span>
          <span className="w-20">Qty</span>
          <span className="w-32">Unit</span>
          <span className="w-16" />
        </div>
      )}
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <select
            value={row.productId}
            onChange={(e) => updateRow(index, { productId: e.target.value })}
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">Select product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Qty"
            value={row.quantity}
            onChange={(e) => updateRow(index, { quantity: e.target.value })}
            className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
            min={1}
          />
          <select
            value={row.unitId}
            onChange={(e) => updateRow(index, { unitId: e.target.value })}
            className="w-32 rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
          >
            <option value="">Select unit…</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded border border-red-900 px-2 text-xs text-red-400 hover:border-red-600"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
        >
          Add Line
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500"
        >
          Clear All Lines
        </button>
      </div>
    </div>
  );
}
