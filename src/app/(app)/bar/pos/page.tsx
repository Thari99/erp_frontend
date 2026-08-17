'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type BarCategory, type BarGuestType, type BarPaymentMethod, type BarProduct, type BarSale, type Member } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { useAppShell } from '@/lib/app-shell';
import { Stepper } from '@/components/booking-form-fields';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

function memberLabel(member: Pick<Member, 'memberNo' | 'title' | 'fullName'>) {
  return `${member.memberNo} ${member.title ? `${member.title} ` : ''}${member.fullName}`;
}

const GUEST_TABS: Array<{ value: BarGuestType; label: string }> = [
  { value: 'WALK_IN', label: 'Non Member' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'CLUB', label: 'Club Use' },
];

interface CartLine {
  productId: string;
  quantity: number;
}

export default function BarPosPage() {
  const requireLogin = useRequireLogin();
  const { isModuleEnabled } = useAppShell();
  const membershipEnabled = isModuleEnabled('membership');

  const [products, setProducts] = useState<BarProduct[]>([]);
  const [categoryList, setCategoryList] = useState<BarCategory[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [guestType, setGuestType] = useState<BarGuestType>('WALK_IN');
  const [guestName, setGuestName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberBoxRef = useRef<HTMLDivElement | null>(null);

  const [serviceCharge, setServiceCharge] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<BarPaymentMethod>('CASH');
  const [paymentTendered, setPaymentTendered] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [completedSale, setCompletedSale] = useState<BarSale | null>(null);

  const [heldSales, setHeldSales] = useState<BarSale[]>([]);
  const [heldPaymentMethod, setHeldPaymentMethod] = useState<Record<string, BarPaymentMethod>>({});
  const [busyHeldId, setBusyHeldId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [productList, cocktailList, held, categories, memberList] = await Promise.all([
        api.listBarProducts(),
        api.listBarCocktails(),
        api.listHeldBarSales(),
        api.listBarCategories(),
        membershipEnabled ? api.listMembers() : Promise.resolve([]),
      ]);
      setProducts([...productList, ...cocktailList]);
      setHeldSales(held);
      setCategoryList(categories);
      setMembers(memberList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, membershipEnabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isMemberDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (memberBoxRef.current && !memberBoxRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMemberDropdownOpen]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(
    () =>
      categoryList
        .filter((c) => c.isActive)
        .map((c) => [c.id, c.name] as const)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [categoryList],
  );

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    if (categoryFilter && product.categoryId !== categoryFilter) return false;
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedMember = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    const active = members.filter((m) => m.status === 'ACTIVE');
    if (!term) return active.slice(0, 20);
    return active
      .filter((m) => memberLabel(m).toLowerCase().includes(term) || m.memberReference?.toLowerCase().includes(term))
      .slice(0, 20);
  }, [members, memberSearch]);

  function quantityInCart(productId: string) {
    return cart.find((line) => line.productId === productId)?.quantity ?? 0;
  }

  function setQuantity(productId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.productId !== productId);
      const existing = prev.find((line) => line.productId === productId);
      if (existing) return prev.map((line) => (line.productId === productId ? { ...line, quantity } : line));
      return [...prev, { productId, quantity }];
    });
  }

  function addToCart(product: BarProduct) {
    const current = quantityInCart(product.id);
    if (current >= product.stockQty) return;
    setQuantity(product.id, current + 1);
  }

  const cartLines = cart.map((line) => ({ ...line, product: productById.get(line.productId) }));
  const subtotal = cartLines.reduce((sum, line) => sum + (line.product ? Number(line.product.unitPrice) * line.quantity : 0), 0);
  const serviceChargePercent = Number(serviceCharge) || 0;
  const serviceChargeAmount = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100;
  const grossAmount = subtotal + serviceChargeAmount;
  const discountAmount = Number(discount) || 0;
  const netAmount = Math.max(0, grossAmount - discountAmount);
  const paymentAmount = guestType === 'WALK_IN' ? Number(paymentTendered) || 0 : guestType === 'MEMBER' ? netAmount : 0;
  const balanceAmount = Math.round((netAmount - paymentAmount) * 100) / 100;

  const canSave =
    cartLines.length > 0 &&
    (guestType === 'CLUB' || netAmount > 0) &&
    (guestType !== 'MEMBER' || !!memberId) &&
    (guestType !== 'WALK_IN' || balanceAmount <= 0);

  function resetCartAndGuest() {
    setCart([]);
    setDiscount('');
    setServiceCharge('');
    setRemarks('');
    setGuestType('WALK_IN');
    setMemberId(null);
    setMemberSearch('');
    setGuestName('');
    setPaymentTendered('');
    setPaymentMethod('CASH');
  }

  async function completeSale() {
    if (!canSave) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const sale = await api.createBarSale({
        items: cartLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        guestType,
        memberId: guestType === 'MEMBER' ? memberId ?? undefined : undefined,
        guestName: guestType === 'WALK_IN' ? guestName.trim() || undefined : undefined,
        paymentMethod: guestType === 'CLUB' ? undefined : guestType === 'MEMBER' ? 'MEMBER' : paymentMethod,
        serviceChargePercent: serviceChargePercent || undefined,
        discount: discountAmount || undefined,
        payment: guestType === 'WALK_IN' ? paymentAmount || undefined : undefined,
        remarks: remarks.trim() || undefined,
      });
      setCompletedSale(sale);
      resetCartAndGuest();
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save bill');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function holdSale() {
    if (cartLines.length === 0) return;
    if (guestType === 'MEMBER' && !memberId) {
      setError('Select a member to hold this bill against');
      return;
    }
    setError(null);
    setIsHolding(true);
    try {
      await api.createBarSale({
        items: cartLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        guestType,
        memberId: guestType === 'MEMBER' ? memberId ?? undefined : undefined,
        guestName: guestType === 'WALK_IN' ? guestName.trim() || undefined : undefined,
        serviceChargePercent: serviceChargePercent || undefined,
        discount: discountAmount || undefined,
        remarks: remarks.trim() || undefined,
        hold: true,
      });
      resetCartAndGuest();
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to hold bill');
    } finally {
      setIsHolding(false);
    }
  }

  async function completeHeldSale(sale: BarSale) {
    setBusyHeldId(sale.id);
    setError(null);
    try {
      const completed = await api.completeBarSale(sale.id, {
        paymentMethod: sale.guestType === 'MEMBER' ? 'MEMBER' : sale.guestType === 'CLUB' ? 'CASH' : heldPaymentMethod[sale.id] ?? 'CASH',
      });
      setCompletedSale(completed);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to complete held sale');
    } finally {
      setBusyHeldId(null);
    }
  }

  async function cancelHeld(sale: BarSale) {
    if (!window.confirm(`Cancel held bill ${sale.saleReference ?? `#${sale.saleNo}`}? This can't be undone.`)) return;
    setBusyHeldId(sale.id);
    setError(null);
    try {
      await api.cancelHeldBarSale(sale.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to cancel held bill');
    } finally {
      setBusyHeldId(null);
    }
  }

  const guestTabs = membershipEnabled ? GUEST_TABS : GUEST_TABS.filter((tab) => tab.value !== 'MEMBER');

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm text-emerald-400">Bar · POS</p>
          <h1 className="text-2xl font-semibold">New Billing</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {completedSale && (
          <div className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
            {completedSale.saleReference ?? `Sale #${completedSale.saleNo}`} completed — Rs. {Number(completedSale.total).toFixed(2)} (
            {completedSale.paymentMethod ?? 'Complimentary'}).
            <Link href={`/bar/sales/${completedSale.id}?autoprint=1`} className="ml-3 text-emerald-400 underline">
              Print Receipt
            </Link>
            <button onClick={() => setCompletedSale(null)} className="ml-3 text-emerald-500 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {categories.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No products match.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredProducts.map((product) => {
                  const inCart = quantityInCart(product.id);
                  const isOut = product.stockQty === 0;
                  const atLimit = inCart >= product.stockQty;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOut || atLimit}
                      onClick={() => addToCart(product)}
                      className={`rounded border px-3 py-3 text-left text-sm ${
                        isOut || atLimit
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                          : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500'
                      }`}
                    >
                      <p className="font-medium">
                        {product.name}
                        {product.isCocktail && (
                          <span className="ml-1.5 rounded bg-purple-950 px-1 py-0.5 text-[10px] uppercase tracking-wide text-purple-400">
                            Cocktail
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">Rs. {Number(product.unitPrice).toFixed(2)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isOut ? (product.isCocktail ? 'Cannot make' : 'Out of stock') : `${product.stockQty} in stock`}
                      </p>
                      {inCart > 0 && <p className="mt-1 text-xs font-medium text-emerald-400">{inCart} in cart</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Order Details</h2>

            <div className="mb-3 flex gap-1 rounded border border-slate-800 bg-slate-950 p-1 text-xs">
              {guestTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setGuestType(tab.value);
                    if (tab.value !== 'MEMBER') setMemberId(null);
                  }}
                  className={`flex-1 rounded px-2 py-1.5 font-medium ${
                    guestType === tab.value ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {guestType === 'MEMBER' && (
              <div className="relative mb-3" ref={memberBoxRef}>
                {selectedMember ? (
                  <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                    <span className="truncate text-slate-200">
                      {memberLabel(selectedMember)}
                      {Number(selectedMember.accountBalance) > 0 && (
                        <span className="ml-2 text-xs text-amber-400">owes Rs. {Number(selectedMember.accountBalance).toFixed(2)}</span>
                      )}
                    </span>
                    <button type="button" onClick={() => setMemberId(null)} className="ml-2 flex-none text-slate-400 hover:text-slate-200">
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setIsMemberDropdownOpen(true);
                      }}
                      onFocus={() => setIsMemberDropdownOpen(true)}
                      placeholder="Search member by name or number…"
                      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                    />
                    {isMemberDropdownOpen && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-700 bg-slate-800 shadow-lg">
                        {filteredMembers.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-slate-500">No matching members</p>
                        ) : (
                          filteredMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setMemberId(m.id);
                                setMemberSearch('');
                                setIsMemberDropdownOpen(false);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                            >
                              {memberLabel(m)}
                              {Number(m.accountBalance) > 0 && (
                                <span className="ml-2 text-xs text-amber-400">owes Rs. {Number(m.accountBalance).toFixed(2)}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {guestType === 'WALK_IN' && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest name (optional)"
                className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            )}

            {guestType === 'CLUB' && (
              <p className="mb-3 rounded border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                Complimentary — no payment will be collected for this bill.
              </p>
            )}

            {cartLines.length === 0 ? (
              <p className="text-sm text-slate-500">No items yet — tap a product to add it.</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {cartLines.map((line) =>
                  line.product ? (
                    <li key={line.productId} className="border-b border-slate-800 pb-2">
                      <p className="truncate text-sm text-slate-200">{line.product.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Stepper
                          label=""
                          value={line.quantity}
                          min={0}
                          onChange={(value) => setQuantity(line.productId, Math.min(value, line.product!.stockQty))}
                        />
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Rs. {Number(line.product.unitPrice).toFixed(2)}</span>
                          <span className="font-medium text-slate-200">Rs. {(Number(line.product.unitPrice) * line.quantity).toFixed(2)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, 0)}
                          className="flex-none rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 hover:bg-red-950"
                          aria-label="Remove item"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  ) : null,
                )}
              </ul>
            )}

            <div className="space-y-2 border-t border-slate-800 pt-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>Subtotal</span>
                <input readOnly value={subtotal.toFixed(2)} className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right text-slate-200" />
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>Service Charge %</span>
                <input
                  type="number"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  min={0}
                  step="0.01"
                  className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>S/C Amount</span>
                <input
                  readOnly
                  value={serviceChargeAmount.toFixed(2)}
                  className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right text-slate-200"
                />
              </div>
              <div className="flex items-center justify-between gap-2 font-medium text-slate-200">
                <span>Grand Total</span>
                <input
                  readOnly
                  value={grossAmount.toFixed(2)}
                  className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right font-semibold text-slate-100"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min={0}
                  step="0.01"
                  className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-base font-semibold text-slate-100">
                <span>Net Amount</span>
                <input
                  readOnly
                  value={netAmount.toFixed(2)}
                  className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right font-semibold text-slate-100"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>Payment</span>
                <input
                  type="number"
                  value={guestType === 'WALK_IN' ? paymentTendered : paymentAmount.toFixed(2)}
                  onChange={(e) => setPaymentTendered(e.target.value)}
                  readOnly={guestType !== 'WALK_IN'}
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className={`w-28 rounded border px-2 py-1 text-right ${
                    guestType === 'WALK_IN' ? 'border-slate-700 bg-slate-800' : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>{balanceAmount < 0 ? 'Change Due' : 'Balance'}</span>
                <input
                  readOnly
                  value={Math.abs(balanceAmount).toFixed(2)}
                  className={`w-28 rounded border px-2 py-1 text-right ${
                    balanceAmount > 0 ? 'border-amber-700 bg-slate-800 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-1 text-xs text-slate-400">Payment method</p>
              {guestType === 'CLUB' ? (
                <p className="text-xs text-slate-500">Not applicable — complimentary bill.</p>
              ) : guestType === 'MEMBER' ? (
                <p className="text-xs text-slate-500">Charged to {selectedMember ? memberLabel(selectedMember) : 'the selected member'}&apos;s account.</p>
              ) : (
                <div className="flex gap-2">
                  {(['CASH', 'CARD'] as BarPaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 rounded border px-3 py-2 text-sm ${
                        paymentMethod === method
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {method === 'CASH' ? 'Cash' : 'Card Payment'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks…"
              rows={2}
              className="mt-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={holdSale}
                disabled={cartLines.length === 0 || isSubmitting || isHolding}
                className="rounded border border-slate-600 py-2 text-sm text-slate-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-50"
              >
                {isHolding ? 'Holding…' : 'Hold Bill'}
              </button>
              <button
                type="button"
                onClick={completeSale}
                disabled={!canSave || isSubmitting || isHolding}
                className="rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save Bill'}
              </button>
            </div>
            <button
              type="button"
              onClick={resetCartAndGuest}
              disabled={cartLines.length === 0}
              className="mt-2 w-full rounded border border-red-900 py-2 text-sm text-red-400 hover:border-red-600 hover:bg-red-950 disabled:opacity-50"
            >
              Empty Cart
            </button>
          </aside>
        </div>

        {heldSales.length > 0 && (
          <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Held Bills ({heldSales.length})</h2>
            <ul className="space-y-3">
              {heldSales.map((sale) => (
                <li key={sale.id} className="rounded border border-amber-900/60 bg-slate-950 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {sale.saleReference ?? `#${sale.saleNo}`}
                        {sale.guestType === 'MEMBER' && sale.member && (
                          <span className="ml-2 text-xs font-normal text-slate-400">— {memberLabel(sale.member)}</span>
                        )}
                        {sale.guestType === 'CLUB' && <span className="ml-2 text-xs font-normal text-amber-400">— Club Use</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Held {formatDateTime(sale.createdAt)} by {sale.soldBy ?? '—'} · {sale.items.length} item(s)
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                        {sale.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity} × {item.product.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right text-sm text-slate-300">
                      <p>Subtotal Rs. {Number(sale.subtotal).toFixed(2)}</p>
                      {Number(sale.discount) > 0 && <p className="text-xs text-slate-500">Discount Rs. {Number(sale.discount).toFixed(2)}</p>}
                      <p className="font-semibold text-slate-100">Total Rs. {Number(sale.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                    {sale.guestType === 'WALK_IN' &&
                      (['CASH', 'CARD'] as BarPaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setHeldPaymentMethod((prev) => ({ ...prev, [sale.id]: method }))}
                          className={`rounded border px-2.5 py-1 text-xs ${
                            (heldPaymentMethod[sale.id] ?? 'CASH') === method
                              ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    {sale.guestType === 'MEMBER' && <span className="text-xs text-slate-500">Will be charged to member account</span>}
                    {sale.guestType === 'CLUB' && <span className="text-xs text-slate-500">Complimentary — no payment</span>}
                    <button
                      type="button"
                      onClick={() => completeHeldSale(sale)}
                      disabled={busyHeldId === sale.id}
                      className="ml-auto rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyHeldId === sale.id ? 'Completing…' : 'Save Bill'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelHeld(sale)}
                      disabled={busyHeldId === sale.id}
                      className="rounded border border-red-900 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                    >
                      Cancel Hold
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
