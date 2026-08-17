'use client';

import { useState } from 'react';
import type { ResourceType } from '@/lib/api';
import { RoomBookingForm } from '@/components/RoomBookingForm';
import { HallBookingForm } from '@/components/HallBookingForm';
import { BoardroomBookingForm } from '@/components/BoardroomBookingForm';

const TABS: Array<{ type: ResourceType; label: string }> = [
  { type: 'ROOM', label: 'Room Booking' },
  { type: 'HALL', label: 'Hall Booking' },
  { type: 'BOARDROOM', label: 'Boardroom Booking' },
];

export default function NewBookingPage() {
  const [type, setType] = useState<ResourceType>('ROOM');

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm text-emerald-400">Booking</p>
          <h1 className="text-2xl font-semibold">New Booking</h1>
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

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          {type === 'ROOM' && <RoomBookingForm />}
          {type === 'HALL' && <HallBookingForm />}
          {type === 'BOARDROOM' && <BoardroomBookingForm />}
        </section>
      </div>
    </main>
  );
}
