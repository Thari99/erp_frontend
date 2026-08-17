'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Booking, type Payment, type ResourceType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { ActionsMenu } from '@/components/ActionsMenu';
import { REF_PREFIX_BY_TYPE, bookingReference } from '@/lib/booking-format';

const TABS: Array<{ type: ResourceType; label: string; refPrefix: string }> = [
  { type: 'ROOM', label: 'Room Booking', refPrefix: REF_PREFIX_BY_TYPE.ROOM },
  { type: 'HALL', label: 'Hall Booking', refPrefix: REF_PREFIX_BY_TYPE.HALL },
  { type: 'BOARDROOM', label: 'Boardroom Booking', refPrefix: REF_PREFIX_BY_TYPE.BOARDROOM },
];

const PAGE_SIZE = 50;

// Plain dot + text, deliberately not button/pill-shaped — this is a read-only status
// indicator, not a control. Checking a guest out only happens from the Checkout page.
const STATUS_DOT_COLORS: Record<Booking['status'], string> = {
  CONFIRMED: 'bg-amber-500',
  CANCELLED: 'bg-red-500',
  CHECKED_OUT: 'bg-emerald-500',
};

const STATUS_TEXT_COLORS: Record<Booking['status'], string> = {
  CONFIRMED: 'text-slate-300',
  CANCELLED: 'text-red-400',
  CHECKED_OUT: 'text-slate-400',
};

const STATUS_LABELS: Record<Booking['status'], string> = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  CHECKED_OUT: 'Checked Out',
};

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatCharge(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function typeColumnLabel(type: ResourceType) {
  if (type === 'ROOM') return 'Room';
  if (type === 'HALL') return 'Hall Type';
  return 'Boardroom Type';
}

function typeColumnValue(booking: Booking) {
  return (
    booking.resource.name ||
    booking.resource.roomType?.name ||
    booking.resource.hallType?.name ||
    booking.resource.boardroomType?.name ||
    '—'
  );
}

export default function ManageBookingPage() {
  const requireLogin = useRequireLogin();
  const [type, setType] = useState<ResourceType>('ROOM');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [bookingList, paymentList] = await Promise.all([api.listBookings(type), api.listPayments()]);
      setBookings(bookingList);
      setPayments(paymentList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, type]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    load();
  }, [load]);

  // Charge shown is what's actually been paid against a booking (summed from recorded
  // payments referencing it) — there's no room-rate/pricing configuration in the system
  // yet, so this reflects real payments, not a preset rate.
  const chargeByBookingId = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of payments) {
      if (payment.status !== 'RECORDED') continue;
      const match = payment.reference.match(/^BOOKING:(.+)$/);
      if (!match) continue;
      map.set(match[1], (map.get(match[1]) ?? 0) + Number(payment.amount));
    }
    return map;
  }, [payments]);

  const activeTab = TABS.find((t) => t.type === type)!;
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageItems = bookings.slice(pageStart, pageStart + PAGE_SIZE);

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await api.cancelBooking(id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm text-emerald-400">Booking</p>
          <h1 className="text-2xl font-semibold">Manage Booking</h1>
        </header>

        <div className="mb-6 flex gap-1 border-b border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setType(tab.type)}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                type === tab.type
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-hidden rounded-lg border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Booking Reference</th>
                  <th className="px-4 py-3 font-medium">Customer Name</th>
                  <th className="px-4 py-3 font-medium">Check In Date</th>
                  <th className="px-4 py-3 font-medium">Check Out Date</th>
                  <th className="px-4 py-3 font-medium">Adult</th>
                  <th className="px-4 py-3 font-medium">Children</th>
                  <th className="px-4 py-3 font-medium">{typeColumnLabel(type)}</th>
                  <th className="px-4 py-3 font-medium">Charge (LKR)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((booking) => (
                    <tr key={booking.id} className="text-slate-200 hover:bg-slate-900/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {bookingReference(booking, activeTab.refPrefix)}
                      </td>
                      <td className="px-4 py-3">{booking.guestName}</td>
                      <td className="px-4 py-3">{formatDate(booking.checkIn)}</td>
                      <td className="px-4 py-3">{formatDate(booking.checkOut)}</td>
                      <td className="px-4 py-3">{booking.adultCount}</td>
                      <td className="px-4 py-3">{booking.childrenCount}</td>
                      <td className="px-4 py-3">{typeColumnValue(booking)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatCharge(chargeByBookingId.get(booking.id) ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${STATUS_TEXT_COLORS[booking.status]}`}>
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${STATUS_DOT_COLORS[booking.status]}`} />
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ActionsMenu
                          items={[
                            {
                              label: 'Cancel',
                              danger: true,
                              disabled: booking.status !== 'CONFIRMED' || busyId === booking.id,
                              onClick: () => handleCancel(booking.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
            <span>
              {bookings.length === 0
                ? 'No results'
                : `Showing ${pageStart + 1} to ${Math.min(pageStart + PAGE_SIZE, bookings.length)} of ${bookings.length} results`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded px-2.5 py-1 text-xs ${
                      p === page ? 'bg-emerald-600 text-white' : 'border border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
