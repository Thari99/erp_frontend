'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Booking, type ResourceType } from '@/lib/api';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_STYLE: Record<ResourceType, string> = {
  ROOM: 'bg-sky-950 text-sky-300 border-sky-800',
  HALL: 'bg-amber-950 text-amber-300 border-amber-800',
  BOARDROOM: 'bg-violet-950 text-violet-300 border-violet-800',
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildMonthGrid(monthAnchor: Date) {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = startOfDay(new Date(firstOfMonth.getTime() - firstOfMonth.getDay() * DAY_MS));
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY_MS));
}

export default function BookingCalendarPage() {
  const router = useRouter();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings(await api.listBookings());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const day of days) {
      const dayStart = day.getTime();
      const dayEnd = dayStart + DAY_MS;
      const matches = bookings.filter((b) => {
        const checkIn = new Date(b.checkIn).getTime();
        const checkOut = new Date(b.checkOut).getTime();
        return checkIn < dayEnd && checkOut > dayStart && b.status !== 'CANCELLED';
      });
      map.set(day.toDateString(), matches);
    }
    return map;
  }, [days, bookings]);

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = startOfDay(new Date()).toDateString();

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Booking</p>
            <h1 className="text-2xl font-semibold">Booking Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
            >
              ← Prev
            </button>
            <span className="w-40 text-center text-sm text-slate-300">{monthLabel}</span>
            <button
              onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
            >
              Next →
            </button>
            <button
              onClick={() => setMonthAnchor(startOfDay(new Date()))}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
            >
              Today
            </button>
          </div>
        </header>

        <div className="mb-4 flex gap-4 text-xs text-slate-400">
          {(['ROOM', 'HALL', 'BOARDROOM'] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm border ${TYPE_STYLE[t]}`} />
              {t}
            </span>
          ))}
        </div>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-slate-900 px-2 py-1.5 text-center text-xs font-medium text-slate-500">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = day.getMonth() === monthAnchor.getMonth();
            const dayBookings = bookingsByDay.get(day.toDateString()) ?? [];
            const isToday = day.toDateString() === today;
            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 bg-slate-950 p-1.5 ${inMonth ? '' : 'opacity-40'}`}
              >
                <div className={`mb-1 text-xs ${isToday ? 'font-semibold text-emerald-400' : 'text-slate-500'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      title={`#${b.bookingNo} ${b.resource.name} — ${b.guestName} (${b.status})`}
                      className={`truncate rounded border px-1 py-0.5 text-[11px] ${TYPE_STYLE[b.resource.type]} ${
                        b.status === 'CHECKED_OUT' ? 'opacity-50' : ''
                      }`}
                    >
                      {b.resource.name}: {b.guestName}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[11px] text-slate-500">+{dayBookings.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      </div>
    </main>
  );
}
