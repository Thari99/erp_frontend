'use client';

import Link from 'next/link';
import type { BookableResource, Member } from '@/lib/api';

export function NoMembersYet() {
  return (
    <p className="text-sm text-slate-500">
      No members yet —{' '}
      <Link href="/members" className="text-emerald-400 underline">
        add one in Members
      </Link>
      .
    </p>
  );
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex overflow-hidden rounded border border-slate-700">
      <span className="flex items-center bg-slate-900 px-3 text-sm text-slate-400">+94</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      <div>
        {children}
        {error && <p className="mt-1 text-xs font-medium text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      <div className="flex items-center overflow-hidden rounded border border-slate-700">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="bg-emerald-800/60 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-800"
        >
          −
        </button>
        <span className="w-10 bg-slate-800 py-1.5 text-center text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="bg-emerald-800/60 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * The "which specific room/hall/boardroom" picker — shown once type + dates are filled
 * in, listing only resources of the chosen category that are actually free for that
 * range. Used by RoomBookingForm / HallBookingForm / BoardroomBookingForm identically.
 */
export function ResourcePicker({
  resources,
  isLoading,
  value,
  onChange,
}: {
  resources: BookableResource[] | null;
  isLoading: boolean;
  value: string;
  onChange: (id: string) => void;
}) {
  if (isLoading) return <p className="text-sm text-slate-500">Checking availability…</p>;
  if (resources === null) return <p className="text-sm text-slate-500">Fill in the date(s) and type above first.</p>;
  if (resources.length === 0) return <p className="text-sm text-slate-500">Nothing available for that range.</p>;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {resources.map((resource) => (
        <li key={resource.id}>
          <button
            type="button"
            onClick={() => onChange(resource.id)}
            className={`w-full rounded border px-3 py-2 text-left text-sm ${
              value === resource.id
                ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600'
            }`}
          >
            {resource.name}
            {resource.capacity ? <span className="text-slate-500"> · cap {resource.capacity}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MemberPicker({
  members,
  value,
  onChange,
  placeholder = 'Select Member',
}: {
  members: Member[];
  value: string;
  onChange: (memberId: string) => void;
  placeholder?: string;
}) {
  if (members.length === 0) return <NoMembersYet />;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
    >
      <option value="">{placeholder}</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          #{member.memberNo} — {member.fullName}
        </option>
      ))}
    </select>
  );
}

export interface GuestDetailsState {
  guestName: string;
  guestPhone: string;
  nic: string;
  landNumber: string;
  email: string;
  referenceMemberId: string;
  clubName: string;
}

/** The Guest Name / NIC / Mobile / Land / Email / Reference / Club Name block for a non-member guest. */
export function NonMemberFields({
  values,
  errors,
  onChange,
  members,
}: {
  values: GuestDetailsState;
  errors?: Partial<Record<keyof GuestDetailsState, string>>;
  onChange: <K extends keyof GuestDetailsState>(key: K, value: GuestDetailsState[K]) => void;
  members: Member[];
}) {
  return (
    <>
      <Field label="Guest Name" required error={errors?.guestName}>
        <input
          value={values.guestName}
          onChange={(e) => onChange('guestName', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder="e.g. John D. Smith"
        />
      </Field>

      <Field label="NIC">
        <input
          value={values.nic}
          onChange={(e) => onChange('nic', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder="e.g. 123456789V"
        />
      </Field>

      <Field label="Mobile Number">
        <PhoneInput value={values.guestPhone} onChange={(v) => onChange('guestPhone', v)} placeholder="71 234 5678" />
      </Field>

      <Field label="Land Number">
        <PhoneInput value={values.landNumber} onChange={(v) => onChange('landNumber', v)} placeholder="81 234 5678" />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={values.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder="e.g. john.doe@example.com"
        />
      </Field>

      <Field label="Reference">
        <MemberPicker
          members={members}
          value={values.referenceMemberId}
          onChange={(id) => onChange('referenceMemberId', id)}
          placeholder="Select Reference Member"
        />
      </Field>

      <Field label="Club Name">
        <input
          value={values.clubName}
          onChange={(e) => onChange('clubName', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder="Optional — e.g. a reciprocal club the guest belongs to"
        />
      </Field>
    </>
  );
}
