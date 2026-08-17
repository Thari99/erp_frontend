'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type Booking, type CurrentUser, type Payment, type TenantProfile } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { REF_PREFIX_BY_TYPE, bookingLineDescription, bookingReference, invoiceReference } from '@/lib/booking-format';

function money(amount: string | number) {
  return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string) {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

export default function ReceiptPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingPayments, setBookingPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    Promise.all([api.getBooking(bookingId), api.listPayments(), api.getTenantProfile(), api.me()])
      .then(([bookingData, payments, profileData, userData]) => {
        setBooking(bookingData);
        // Oldest first — the advance (if any) taken at booking time, then whatever was
        // settled at checkout. Balance/invoice math below is based on this real history,
        // not just the booking's own snapshot fields, so it's correct at either moment.
        setBookingPayments(
          payments
            .filter((p) => p.reference === `BOOKING:${bookingId}` && p.status === 'RECORDED')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        );
        setProfile(profileData);
        setUser(userData);
      })
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load receipt');
      })
      .finally(() => setIsLoading(false));
  }, [bookingId, requireLogin]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p>{error ?? 'Booking not found'}</p>
      </main>
    );
  }

  const refPrefix = REF_PREFIX_BY_TYPE[booking.resource.type];
  const reference = bookingReference(booking, refPrefix);
  const latestPayment = bookingPayments[bookingPayments.length - 1] ?? null;
  const invoiceNo = latestPayment ? invoiceReference(latestPayment) : '—';
  const customer = booking.guestType === 'MEMBER' && booking.member ? `${booking.member.memberNo} ${booking.guestName}` : booking.guestName;
  const grandTotal = Number(booking.subtotal) + Number(booking.serviceChargeAmount);
  // Real remaining balance from actual payment history — not booking.netAmount, which is
  // only a snapshot of "after the advance" taken at booking time and stays fixed even
  // once a later checkout payment settles the rest.
  const totalDue = Math.max(0, grandTotal - Number(booking.discount));
  const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, totalDue - totalPaid);
  const signatureLabel = booking.guestType === 'MEMBER' ? 'Member Signature' : 'Guest Signature';
  const statusHeading = booking.status === 'CHECKED_OUT' ? 'Checked Out' : 'Booking Confirmed';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-black print:bg-white">
      <div className="mx-auto mb-4 flex max-w-[420px] gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Print
        </button>
        <button
          onClick={() => router.push('/booking/new')}
          className="flex-1 rounded border border-slate-400 bg-white py-2 text-sm font-medium text-slate-700 hover:border-slate-600"
        >
          New Booking
        </button>
      </div>

      <div className="mx-auto max-w-[420px] border-2 border-black bg-white p-6 font-mono text-[13px] leading-relaxed">
        <div className="text-center">
          {profile?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo} alt="" className="mx-auto mb-2 h-16 w-16 object-contain" />
          )}
          <p className="text-lg font-bold">{profile?.name ?? booking.resource.name}</p>
          {profile?.address && <p>{profile.address}</p>}
          {profile?.phone && <p>{profile.phone}</p>}
          {profile?.email && <p>Email: {profile.email}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <p className="text-center font-bold underline">{statusHeading}</p>

        <div className="mt-3 space-y-1">
          <div className="flex">
            <span className="w-28 font-bold">Reference NO:</span>
            <span>{reference}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold">Invoice NO</span>
            <span>: {invoiceNo}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold">Customer</span>
            <span>: {customer}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold">Contact NO</span>
            <span>: {booking.guestPhone ?? '—'}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold">Date/Time</span>
            <span>: {formatDateTime(booking.createdAt)}</span>
          </div>
        </div>

        <div className="my-3 border-t-2 border-black" />

        <div className="flex justify-between font-bold">
          <span>Description</span>
          <span>Amount (LKR)</span>
        </div>

        <div className="my-2 border-t-2 border-black" />

        <div className="flex justify-between gap-3">
          <span className="flex-1">{bookingLineDescription(booking)}</span>
          <span className="whitespace-nowrap">{money(grandTotal)}</span>
        </div>

        {Number(booking.discount) > 0 && (
          <div className="mt-1 flex justify-between">
            <span>Discount:</span>
            <span>{money(booking.discount)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between">
          <span>Advance:</span>
          <span>{money(booking.advance)}</span>
        </div>
        {bookingPayments.length > 1 && latestPayment && (
          <div className="flex justify-between">
            <span>Paid Now:</span>
            <span>{money(latestPayment.amount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Balance:</span>
          <span>{money(balanceDue)}</span>
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <p>Printed By: {user?.username ?? '—'}</p>

        <p className="mt-4">{signatureLabel}: ____________________</p>

        <p className="mt-6 text-center font-semibold">Thank You! Come Again</p>
      </div>
    </main>
  );
}
