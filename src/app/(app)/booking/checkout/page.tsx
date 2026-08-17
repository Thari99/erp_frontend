'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Banknote, Wallet, Search, Home, Receipt } from 'lucide-react';
import { api, ApiError, type Booking, type Payment } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { REF_PREFIX_BY_TYPE, bookingReference } from '@/lib/booking-format';

type PaymentMethod = 'CARD' | 'CASH' | 'MEMBER_CREDIT';

const DEBIT_ACCOUNT_BY_METHOD: Record<PaymentMethod, string> = {
  CASH: '1000',
  CARD: '4000',
  MEMBER_CREDIT: '4000',
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof CreditCard }> = [
  { value: 'CARD', label: 'Card Payment', icon: CreditCard },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'MEMBER_CREDIT', label: 'Credit', icon: Wallet },
];

function money(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resourceTypeLabel(booking: Booking) {
  if (booking.resource.type === 'ROOM') return 'Room';
  if (booking.resource.type === 'HALL') return 'Hall';
  return 'Boardroom';
}

function roomTypeName(booking: Booking) {
  return booking.resource.roomType?.name ?? booking.resource.hallType?.name ?? booking.resource.boardroomType?.name ?? '—';
}

function customerLabel(booking: Booking) {
  return booking.guestType === 'MEMBER' && booking.member ? `${booking.member.memberNo} ${booking.guestName}` : booking.guestName;
}

export default function CheckoutBookingPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [serviceChargePercent, setServiceChargePercent] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('0.00');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bookingList, paymentList] = await Promise.all([api.listBookings(), api.listPayments()]);
      setBookings(bookingList.filter((b) => b.status === 'CONFIRMED'));
      setPayments(paymentList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load checkout list');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [customerLabel(b), b.resource.name, roomTypeName(b), bookingReference(b, REF_PREFIX_BY_TYPE[b.resource.type])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [bookings, search]);

  const selectedBooking = bookings.find((b) => b.id === selectedId) ?? null;

  const paidSoFar = useMemo(() => {
    if (!selectedBooking) return 0;
    return payments
      .filter((p) => p.reference === `BOOKING:${selectedBooking.id}` && p.status === 'RECORDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments, selectedBooking]);

  const subtotal = selectedBooking ? Number(selectedBooking.subtotal) : 0;
  const advance = selectedBooking ? Number(selectedBooking.advance) : 0;
  const serviceChargeAmount = subtotal * ((Number(serviceChargePercent) || 0) / 100);
  const grossAmount = subtotal + serviceChargeAmount;
  const discountNum = Number(discount) || 0;
  // Informational only — "what was left after the advance", same figure the booking-time
  // receipt shows as Balance. NOT used to compute what's still owed below: paidSoFar
  // already includes that advance as a real recorded payment, so subtracting it again
  // here would double-count it.
  const netAmount = Math.max(0, grossAmount - discountNum - advance);
  const totalDue = Math.max(0, grossAmount - discountNum);
  const amountPayable = Math.max(0, totalDue - paidSoFar);
  const balance = Math.max(0, amountPayable - (Number(paymentAmount) || 0));

  function selectBooking(booking: Booking) {
    setSelectedId(booking.id);
    setError(null);
    setNotice(null);
    setServiceChargePercent(Number(booking.serviceChargePercent).toString());
    setDiscount(Number(booking.discount).toString());
    const alreadyPaid = payments
      .filter((p) => p.reference === `BOOKING:${booking.id}` && p.status === 'RECORDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const bookingTotalDue = Number(booking.subtotal) + Number(booking.serviceChargeAmount) - Number(booking.discount);
    const payable = Math.max(0, bookingTotalDue - alreadyPaid);
    setPaymentAmount(payable.toFixed(2));
  }

  // Keep the suggested Payment amount in sync while the staff is still adjusting service
  // charge/discount — once they type into Payment directly, further edits here just don't
  // happen (the sliders/amount fields are reviewed together before an actual payment).
  useEffect(() => {
    if (!selectedBooking) return;
    setPaymentAmount(amountPayable.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceChargePercent, discount, selectedId]);

  async function makePayment() {
    if (!selectedBooking) return;
    const amount = Number(paymentAmount) || 0;
    if (amount < 0) {
      setError('Enter a valid payment amount');
      return;
    }
    // A tiny epsilon guards against float rounding (e.g. 999.9999999) falsely reading as
    // an overpayment — amountPayable/amount both come from arithmetic on decimal strings.
    if (amount > amountPayable + 0.01) {
      setError(`Payment cannot exceed the amount payable (LKR ${money(amountPayable)}).`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.updateBookingPricing(selectedBooking.id, {
        serviceChargePercent: Number(serviceChargePercent) || 0,
        serviceChargeAmount,
        discount: discountNum,
        netAmount,
      });
      if (amount > 0) {
        await api.recordPayment({
          reference: `BOOKING:${selectedBooking.id}`,
          amount,
          method,
          debitAccountCode: DEBIT_ACCOUNT_BY_METHOD[method],
          creditAccountCode: '1100',
        });
      }
      const stillOwed = Math.max(0, amountPayable - amount);
      if (stillOwed <= 0.01) {
        await api.checkOutBooking(selectedBooking.id);
        router.push(`/receipt/${selectedBooking.id}`);
        return;
      }
      const reference = bookingReference(selectedBooking, REF_PREFIX_BY_TYPE[selectedBooking.resource.type]);
      setNotice(
        `Recorded a partial payment of LKR ${money(amount)} for ${reference}. LKR ${money(stillOwed)} still due — booking not checked out.`,
      );
      setSelectedId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full grid-cols-1 gap-6 p-6 text-slate-50 lg:grid-cols-[1fr_420px]">
      <div>
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="mb-4 border-b border-slate-800 pb-3">
          <h1 className="text-lg font-semibold">Checkout List</h1>
        </div>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && (
          <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">{notice}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : filteredBookings.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting for checkout.</p>
          ) : (
            filteredBookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => selectBooking(booking)}
                className={`rounded-lg border p-4 text-left ${
                  selectedId === booking.id ? 'border-emerald-500 bg-slate-800' : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                }`}
              >
                <p className="font-semibold">{customerLabel(booking)}</p>
                <p className="mb-2 text-xs text-slate-500">{bookingReference(booking, REF_PREFIX_BY_TYPE[booking.resource.type])}</p>
                <div className="mb-2 flex items-center gap-4 text-xs text-slate-400">
                  <span>{booking.adultCount + booking.childrenCount} Guest</span>
                  <span className="flex items-center gap-1">
                    <Home size={12} /> 1 Rooms
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300">Room type:</p>
                <p className="mb-3 text-sm">
                  1x{roomTypeName(booking)} {resourceTypeLabel(booking)}
                </p>
                <span className="inline-block rounded border border-amber-700 px-3 py-1 text-xs font-medium text-amber-500">
                  Check Out Pending
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-2 text-sm font-semibold">Customers/Members</h2>
        <div className="mb-4 border-b border-slate-800 pb-4 text-sm">
          {selectedBooking ? (
            <div className="space-y-1 text-slate-300">
              <p className="font-medium text-white">{customerLabel(selectedBooking)}</p>
              <p className="text-xs text-slate-400">{selectedBooking.guestPhone ?? '—'}</p>
              <p className="text-xs text-slate-400">{selectedBooking.guestType === 'MEMBER' ? 'Member' : 'Non Member'}</p>
            </div>
          ) : (
            <p className="text-center text-slate-500">Please Select Booking</p>
          )}
        </div>

        <h2 className="mb-2 text-sm font-semibold">Booking Details</h2>
        <div className="mb-4 border-b border-slate-800 pb-4 text-sm">
          {selectedBooking ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Reference</span>
                <span>{bookingReference(selectedBooking, REF_PREFIX_BY_TYPE[selectedBooking.resource.type])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Resource</span>
                <span>{selectedBooking.resource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check In</span>
                <span>{new Date(selectedBooking.checkIn).toISOString().slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check Out</span>
                <span>{new Date(selectedBooking.checkOut).toISOString().slice(0, 10)}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500">Please Select Booking</p>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Sub Total</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input readOnly value={money(subtotal)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Service Charge</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={!selectedBooking}
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(e.target.value)}
                className="no-spinner w-16 bg-transparent px-2 py-1.5 text-right text-sm disabled:opacity-50"
              />
              <span className="border-l border-slate-700 px-2 py-1.5 text-xs text-slate-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Gross Amount</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input readOnly value={money(grossAmount)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Discount</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={!selectedBooking}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="no-spinner w-28 bg-transparent px-2 py-1.5 text-right text-sm disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Advance</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input readOnly value={money(advance)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Net Amount</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input readOnly value={money(netAmount)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Amount payable</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input readOnly value={money(amountPayable)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Payment</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
              <span className="border-r border-slate-700 px-2 py-1.5 text-xs text-slate-500">LKR</span>
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={!selectedBooking}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="no-spinner w-28 bg-transparent px-2 py-1.5 text-right text-sm disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-emerald-400">Balance</span>
            <div className="flex items-center overflow-hidden rounded border border-emerald-800 bg-slate-800">
              <span className="border-r border-emerald-800 px-2 py-1.5 text-xs text-emerald-500">LKR</span>
              <input readOnly value={money(balance)} className="w-28 bg-transparent px-2 py-1.5 text-right text-sm font-semibold text-emerald-300" />
            </div>
          </div>
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold">Payment method:</h2>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!selectedBooking}
                onClick={() => setMethod(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm disabled:opacity-40 ${
                  method === opt.value ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Icon size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={makePayment}
          disabled={!selectedBooking || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Receipt size={16} />
          {isSubmitting ? 'Processing…' : 'Make Payment'}
        </button>
      </div>
    </div>
  );
}
