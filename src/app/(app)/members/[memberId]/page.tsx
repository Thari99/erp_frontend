'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type Booking, type Member, type MemberAccountTransaction, type MemberStatus } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { REF_PREFIX_BY_TYPE, bookingReference } from '@/lib/booking-format';

const MEMBER_TYPE_LABELS: Record<Member['memberType'], string> = {
  LIFETIME: 'Lifetime Member',
  NORMAL: 'Normal Member',
  CORPORATE: 'Corporate Member',
  COMPLIMENTARY: 'Complimentary Member',
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  UNDER_REVIEW: 'Under Review',
  ACTIVE: 'Activated',
  DEACTIVATED: 'Deactivated',
};

const STATUS_STYLES: Record<MemberStatus, string> = {
  UNDER_REVIEW: 'bg-amber-950 text-amber-400',
  ACTIVE: 'bg-emerald-950 text-emerald-400',
  DEACTIVATED: 'bg-slate-800 text-slate-500',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

export default function MemberProfilePage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ memberId: string }>();

  const [member, setMember] = useState<Member | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<MemberAccountTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const [sdDescription, setSdDescription] = useState('');
  const [sdDate, setSdDate] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [paymentDescription, setPaymentDescription] = useState('');

  const load = useCallback(async () => {
    if (!params.memberId) return;
    try {
      const [memberData, bookingList, transactions] = await Promise.all([
        api.getMember(params.memberId),
        api.listBookings(undefined, params.memberId),
        api.getMemberAccountTransactions(params.memberId),
      ]);
      setMember(memberData);
      setBookings(bookingList);
      setAccountTransactions(transactions);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load member');
    } finally {
      setIsLoading(false);
    }
  }, [params.memberId, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: MemberStatus) {
    if (!member) return;
    setIsBusy(true);
    setError(null);
    try {
      await api.updateMemberStatus(member.id, status);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setIsBusy(false);
    }
  }

  async function addSpecialDate(event: React.FormEvent) {
    event.preventDefault();
    if (!member || !sdDescription || !sdDate) return;
    setIsBusy(true);
    setError(null);
    try {
      await api.addMemberSpecialDate(member.id, { description: sdDescription, date: sdDate });
      setSdDescription('');
      setSdDate('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add special date');
    } finally {
      setIsBusy(false);
    }
  }

  async function removeSpecialDate(specialDateId: string) {
    if (!member) return;
    setIsBusy(true);
    setError(null);
    try {
      await api.removeMemberSpecialDate(member.id, specialDateId);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to remove special date');
    } finally {
      setIsBusy(false);
    }
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!member) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    setIsBusy(true);
    setError(null);
    try {
      await api.recordMemberAccountPayment(member.id, { amount, method: paymentMethod, description: paymentDescription.trim() || undefined });
      setPaymentAmount('');
      setPaymentMethod('CASH');
      setPaymentDescription('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!member) return;
    if (!window.confirm(`Delete member "${member.fullName}"? This can't be undone.`)) return;
    setIsBusy(true);
    try {
      await api.deleteMember(member.id);
      router.push('/members');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete member');
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="px-6 py-10 text-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="px-6 py-10 text-slate-50">
        <p className="text-sm text-red-400">{error ?? 'Member not found'}</p>
      </main>
    );
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Membership</p>
            <h1 className="text-2xl font-semibold">{member.fullName}</h1>
            <p className="text-sm text-slate-500">{member.memberReference ?? `#${member.memberNo}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/members/${member.id}/edit`}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={isBusy}
              className="rounded border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:border-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-4">
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo} alt="" className="h-16 w-16 rounded border border-slate-700 object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-700 text-[10px] text-slate-500">
                  No photo
                </div>
              )}
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[member.status]}`}>
                  {STATUS_LABELS[member.status]}
                </span>
                <p className="mt-1 text-sm text-slate-400">{MEMBER_TYPE_LABELS[member.memberType]}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {member.status !== 'ACTIVE' && (
                <button
                  onClick={() => changeStatus('ACTIVE')}
                  disabled={isBusy}
                  className="rounded border border-emerald-700 px-3 py-1.5 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                >
                  Activate
                </button>
              )}
              {member.status !== 'DEACTIVATED' && (
                <button
                  onClick={() => changeStatus('DEACTIVATED')}
                  disabled={isBusy}
                  className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                >
                  Deactivate
                </button>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Member Information</h2>
            <dl className="space-y-1.5">
              {[
                ['Title', member.title ?? '—'],
                ['Address', member.address ?? '—'],
                ['NIC', member.nic ?? '—'],
                ['Date of Birth', formatDate(member.dob)],
                ['Mobile', member.phone ?? '—'],
                ['Land Number', member.landNumber ?? '—'],
                ['Email', member.email ?? '—'],
                ['Join Date', formatDate(member.joinDate)],
                ['Resigned Date', formatDate(member.resignDate)],
                ['Reference By', member.referredBy ? `${member.referredBy.memberReference ?? '#' + member.referredBy.memberNo} — ${member.referredBy.fullName}` : '—'],
                ['Remark', member.remark ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Account</h2>
            <p className="text-sm">
              <span className="text-slate-500">Balance owed: </span>
              <span className={`font-semibold ${Number(member.accountBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Rs. {Number(member.accountBalance).toFixed(2)}
              </span>
            </p>
          </div>

          {accountTransactions.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No account activity yet.</p>
          ) : (
            <ul className="mb-4 max-h-64 divide-y divide-slate-800 overflow-y-auto">
              {accountTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <span
                      className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        tx.type === 'CHARGE' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                      }`}
                    >
                      {tx.type === 'CHARGE' ? 'Charge' : tx.type === 'PAYMENT' ? 'Payment' : 'Reversal'}
                    </span>
                    <span className="text-slate-300">{tx.description ?? tx.reference ?? '—'}</span>
                  </div>
                  <div className="flex-none text-right">
                    <p className={tx.type === 'CHARGE' ? 'text-amber-400' : 'text-emerald-400'}>
                      {tx.type === 'CHARGE' ? '+' : '-'}Rs. {Number(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={recordPayment} className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="Payment amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min={0.01}
              step="0.01"
              className="w-40 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'BANK_TRANSFER')}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
            <input
              placeholder="Description (optional)"
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isBusy || !paymentAmount || Number(paymentAmount) <= 0}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Record Payment
            </button>
          </form>
        </section>

        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Special Dates</h2>
          {member.specialDates.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No special dates yet.</p>
          ) : (
            <ul className="mb-4 divide-y divide-slate-800">
              {member.specialDates.map((sd) => (
                <li key={sd.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {sd.description} — <span className="text-slate-400">{formatDate(sd.date)}</span>
                  </span>
                  <button
                    onClick={() => removeSpecialDate(sd.id)}
                    disabled={isBusy}
                    className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addSpecialDate} className="flex flex-wrap gap-2">
            <input
              placeholder="Description — e.g. Birthday"
              value={sdDescription}
              onChange={(e) => setSdDescription(e.target.value)}
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={sdDate}
              onChange={(e) => setSdDate(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isBusy || !sdDescription || !sdDate}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Booking History</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {bookings.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-slate-500">
                      {bookingReference(booking, REF_PREFIX_BY_TYPE[booking.resource.type])}
                    </span>{' '}
                    <span className="font-medium">{booking.resource.name}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} · {booking.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
