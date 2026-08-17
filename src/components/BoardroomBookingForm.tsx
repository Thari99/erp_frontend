'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { api, type BoardroomType, type BookableResource, type GuestType, type Member } from '@/lib/api';
import { Field, MemberPicker, NonMemberFields, ResourcePicker, type GuestDetailsState } from './booking-form-fields';
import { BookingPaymentSummary } from './BookingPaymentSummary';

const GUEST_TYPE_OPTIONS: Array<{ value: GuestType; label: string }> = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'NON_MEMBER', label: 'Non Member' },
];

interface FormState extends GuestDetailsState {
  bookingDate: string;
  inTime: string;
  outTime: string;
  boardroomTypeId: string;
  resourceId: string;
  guestType: GuestType | '';
  memberId: string;
}

const initialState: FormState = {
  bookingDate: '',
  inTime: '',
  outTime: '',
  boardroomTypeId: '',
  resourceId: '',
  guestType: '',
  memberId: '',
  guestName: '',
  nic: '',
  guestPhone: '',
  landNumber: '',
  email: '',
  referenceMemberId: '',
  clubName: '',
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function BoardroomBookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [availableBoardrooms, setAvailableBoardrooms] = useState<BookableResource[] | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [boardroomTypes, setBoardroomTypes] = useState<BoardroomType[]>([]);

  const [step, setStep] = useState<'form' | 'summary'>('form');

  useEffect(() => {
    api.listMembers().then(setMembers).catch(() => {});
    api.listBoardroomTypes().then(setBoardroomTypes).catch(() => {});
  }, []);

  useEffect(() => {
    setForm((prev) => (prev.resourceId ? { ...prev, resourceId: '' } : prev));

    if (!form.bookingDate || !form.inTime || !form.outTime || !form.boardroomTypeId) {
      setAvailableBoardrooms(null);
      return;
    }
    if (form.outTime <= form.inTime) {
      setAvailableBoardrooms(null);
      return;
    }

    let cancelled = false;
    setIsCheckingAvailability(true);
    api
      .findAvailableResources('BOARDROOM', toIso(form.bookingDate, form.inTime), toIso(form.bookingDate, form.outTime), {
        boardroomTypeId: form.boardroomTypeId,
      })
      .then((rooms) => {
        if (!cancelled) setAvailableBoardrooms(rooms);
      })
      .catch(() => {
        if (!cancelled) setAvailableBoardrooms([]);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bookingDate, form.inTime, form.outTime, form.boardroomTypeId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setGuestType(value: GuestType) {
    setForm((prev) => ({ ...prev, guestType: value, memberId: '', guestName: '', guestPhone: '' }));
    setErrors((prev) => ({ ...prev, guestType: undefined, memberId: undefined, guestName: undefined }));
  }

  function selectMember(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    setForm((prev) => ({
      ...prev,
      memberId,
      guestName: member?.fullName ?? prev.guestName,
      guestPhone: member?.phone ?? prev.guestPhone,
    }));
    setErrors((prev) => ({ ...prev, memberId: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.bookingDate) next.bookingDate = 'Booking Date is required';
    if (!form.inTime) next.inTime = 'Check-in Time is required';
    if (!form.outTime) next.outTime = 'Check-out Time is required';
    if (form.inTime && form.outTime && form.outTime <= form.inTime) {
      next.outTime = 'Check-out must be after check-in';
    }
    if (!form.boardroomTypeId) next.boardroomTypeId = 'Boardroom Type is required';
    if (!form.resourceId) next.resourceId = 'Select which boardroom';
    if (!form.guestType) next.guestType = 'Guest Type is required';

    if (form.guestType === 'MEMBER' && !form.memberId) {
      next.memberId = 'Select which member this booking is for';
    }
    if (form.guestType === 'NON_MEMBER' && !form.guestName.trim()) {
      next.guestName = 'Guest Name is required';
    }
    return next;
  }

  const selectedBoardroomType = boardroomTypes.find((bt) => bt.id === form.boardroomTypeId) ?? null;
  const selectedMember = members.find((m) => m.id === form.memberId) ?? null;
  const rate = selectedBoardroomType
    ? Number(form.guestType === 'MEMBER' ? selectedBoardroomType.memberRate : selectedBoardroomType.nonMemberRate)
    : 0;
  const subtotal = rate;

  function goToSummary(event: React.FormEvent) {
    event.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    setApiError(null);
    setStep('summary');
  }

  if (step === 'summary') {
    return (
      <BookingPaymentSummary
        subtotal={subtotal}
        summaryRows={[
          { label: 'Booking Date', value: form.bookingDate },
          { label: 'In Time', value: form.inTime },
          { label: 'Out Time', value: form.outTime },
          { label: 'Conference Room type', value: selectedBoardroomType?.name ?? '—' },
          { label: 'Guest Type', value: form.guestType === 'MEMBER' ? 'Member' : 'Non Member' },
          ...(form.guestType === 'MEMBER' ? [{ label: 'Member', value: String(selectedMember?.memberNo ?? '—') }] : []),
        ]}
        onCreateBooking={(pricing) =>
          api.createBooking({
            resourceId: form.resourceId,
            guestName: form.guestName,
            guestPhone: form.guestPhone || undefined,
            guestType: form.guestType as GuestType,
            memberId: form.guestType === 'MEMBER' ? form.memberId : undefined,
            nic: form.guestType === 'NON_MEMBER' ? form.nic || undefined : undefined,
            landNumber: form.guestType === 'NON_MEMBER' ? form.landNumber || undefined : undefined,
            email: form.guestType === 'NON_MEMBER' ? form.email || undefined : undefined,
            clubName: form.guestType === 'NON_MEMBER' ? form.clubName || undefined : undefined,
            referenceMemberId: form.guestType === 'NON_MEMBER' ? form.referenceMemberId || undefined : undefined,
            checkIn: toIso(form.bookingDate, form.inTime),
            checkOut: toIso(form.bookingDate, form.outTime),
            ...pricing,
          })
        }
        onFinalized={(booking) => router.push(`/receipt/${booking.id}`)}
        onBack={() => setStep('form')}
      />
    );
  }

  return (
    <form onSubmit={goToSummary} className="max-w-2xl space-y-5">
      {apiError && <p className="rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{apiError}</p>}

      <Field label="Booking Date" required error={errors.bookingDate}>
        <input
          type="date"
          value={form.bookingDate}
          onChange={(e) => set('bookingDate', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="In Time" required error={errors.inTime}>
        <input
          type="time"
          value={form.inTime}
          onChange={(e) => set('inTime', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Out Time" required error={errors.outTime}>
        <input
          type="time"
          value={form.outTime}
          onChange={(e) => set('outTime', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Conference Room type" required error={errors.boardroomTypeId}>
        <select
          value={form.boardroomTypeId}
          onChange={(e) => set('boardroomTypeId', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select Boardroom Type</option>
          {boardroomTypes
            .filter((bt) => bt.isActive)
            .map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="Select Boardroom" required error={errors.resourceId}>
        <ResourcePicker
          resources={availableBoardrooms}
          isLoading={isCheckingAvailability}
          value={form.resourceId}
          onChange={(id) => set('resourceId', id)}
        />
      </Field>

      <Field label="Guest Type" required error={errors.guestType}>
        <select
          value={form.guestType}
          onChange={(e) => setGuestType(e.target.value as GuestType)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select Guest Type</option>
          {GUEST_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      {form.guestType === 'MEMBER' && (
        <Field label="Member" required error={errors.memberId}>
          <MemberPicker members={members} value={form.memberId} onChange={selectMember} />
        </Field>
      )}

      {form.guestType === 'NON_MEMBER' && (
        <NonMemberFields values={form} errors={errors} onChange={set} members={members} />
      )}

      <button
        type="submit"
        className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <Save size={16} />
        Save Records
      </button>
    </form>
  );
}
