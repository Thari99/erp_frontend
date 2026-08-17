'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { api, ApiError, type BookableResource, type GuestType, type MealType, type Member, type RoomType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { Field, MemberPicker, NonMemberFields, ResourcePicker, Stepper, type GuestDetailsState } from './booking-form-fields';
import { BookingPaymentSummary } from './BookingPaymentSummary';

const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: 'MEMBER_SINGLE', label: 'Member Single' },
  { value: 'MEMBER_DOUBLE', label: 'Member Double' },
  { value: 'MEMBER_TRIPLE', label: 'Member Triple' },
  { value: 'MEMBER_FAMILY', label: 'Member Family' },
  { value: 'NON_MEMBER_SINGLE', label: 'Non Member Single' },
  { value: 'NON_MEMBER_DOUBLE', label: 'Non Member Double' },
  { value: 'NON_MEMBER_TRIPLE', label: 'Non Member Triple' },
  { value: 'NON_MEMBER_FAMILY', label: 'Non Member Family' },
];

const GUEST_TYPE_OPTIONS: Array<{ value: GuestType; label: string }> = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'NON_MEMBER', label: 'Non Member' },
];

interface FormState extends GuestDetailsState {
  checkIn: string;
  checkOut: string;
  roomTypeId: string;
  resourceId: string;
  adultCount: number;
  childrenCount: number;
  mealType: MealType | '';
  guestType: GuestType | '';
  memberId: string;
}

const initialState: FormState = {
  checkIn: '',
  checkOut: '',
  roomTypeId: '',
  resourceId: '',
  adultCount: 1,
  childrenCount: 0,
  mealType: '',
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

function toIsoCheckIn(date: string) {
  return new Date(`${date}T14:00:00`).toISOString();
}
function toIsoCheckOut(date: string) {
  return new Date(`${date}T11:00:00`).toISOString();
}

function nightsBetween(checkIn: string, checkOut: string) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function RoomBookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [availableRooms, setAvailableRooms] = useState<BookableResource[] | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  // Step 2 — shown after "Save Records" passes validation: review the computed charge,
  // adjust service charge/discount/advance, then finalize by picking how it was paid.
  const [step, setStep] = useState<'form' | 'summary'>('form');

  useEffect(() => {
    api.listMembers().then(setMembers).catch(() => {
      // Membership always ships enabled alongside Booking (see Module Registry), so this
      // shouldn't normally fail on licensing — if it does, the dropdowns below just stay empty.
    });
    api.listRoomTypes().then(setRoomTypes).catch(() => {});
  }, []);

  // Re-checks availability whenever dates or the room type change, and drops any
  // previously-selected specific room since it may no longer be the right list.
  useEffect(() => {
    setForm((prev) => (prev.resourceId ? { ...prev, resourceId: '' } : prev));

    if (!form.checkIn || !form.checkOut || !form.roomTypeId || form.checkOut <= form.checkIn) {
      setAvailableRooms(null);
      return;
    }

    let cancelled = false;
    setIsCheckingAvailability(true);
    api
      .findAvailableResources('ROOM', toIsoCheckIn(form.checkIn), toIsoCheckOut(form.checkOut), {
        roomTypeId: form.roomTypeId,
      })
      .then((rooms) => {
        if (!cancelled) setAvailableRooms(rooms);
      })
      .catch(() => {
        if (!cancelled) setAvailableRooms([]);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.checkIn, form.checkOut, form.roomTypeId]);

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
    if (!form.checkIn) next.checkIn = 'Check-in Date is required';
    if (!form.checkOut) next.checkOut = 'Check-out Date is required';
    if (form.checkIn && form.checkOut && form.checkOut <= form.checkIn) {
      next.checkOut = 'Check-out must be after check-in';
    }
    if (!form.roomTypeId) next.roomTypeId = 'Room Type is required';
    if (!form.resourceId) next.resourceId = 'Select which room';
    if (!form.mealType) next.mealType = 'Meal Type is required';
    if (!form.guestType) next.guestType = 'Guest Type is required';

    if (form.guestType === 'MEMBER' && !form.memberId) {
      next.memberId = 'Select which member this booking is for';
    }
    if (form.guestType === 'NON_MEMBER' && !form.guestName.trim()) {
      next.guestName = 'Guest Name is required';
    }
    return next;
  }

  const selectedRoomType = roomTypes.find((rt) => rt.id === form.roomTypeId) ?? null;
  const selectedMember = members.find((m) => m.id === form.memberId) ?? null;
  const nights = form.checkIn && form.checkOut ? nightsBetween(form.checkIn, form.checkOut) : 0;
  const rate = selectedRoomType
    ? Number(form.guestType === 'MEMBER' ? selectedRoomType.memberRate : selectedRoomType.nonMemberRate)
    : 0;
  const subtotal = rate * nights;

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
          { label: 'Check In date', value: form.checkIn },
          { label: 'Check Out Date', value: form.checkOut },
          { label: 'Room Type', value: selectedRoomType?.name ?? '—' },
          { label: 'Adult', value: String(form.adultCount) },
          { label: 'Children', value: String(form.childrenCount) },
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
            mealType: form.mealType as MealType,
            adultCount: form.adultCount,
            childrenCount: form.childrenCount,
            checkIn: toIsoCheckIn(form.checkIn),
            checkOut: toIsoCheckOut(form.checkOut),
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

      <Field label="Check In" required error={errors.checkIn}>
        <input
          type="date"
          value={form.checkIn}
          onChange={(e) => set('checkIn', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Check Out" required error={errors.checkOut}>
        <input
          type="date"
          value={form.checkOut}
          onChange={(e) => set('checkOut', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Room type" required error={errors.roomTypeId}>
        <select
          value={form.roomTypeId}
          onChange={(e) => set('roomTypeId', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select Room Type</option>
          {roomTypes
            .filter((rt) => rt.isActive)
            .map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="Select Room" required error={errors.resourceId}>
        <ResourcePicker
          resources={availableRooms}
          isLoading={isCheckingAvailability}
          value={form.resourceId}
          onChange={(id) => set('resourceId', id)}
        />
      </Field>

      <Field label="Guest">
        <div className="flex gap-6">
          <Stepper label="Adult" value={form.adultCount} min={0} onChange={(v) => set('adultCount', v)} />
          <Stepper label="Children" value={form.childrenCount} min={0} onChange={(v) => set('childrenCount', v)} />
        </div>
      </Field>

      <Field label="Meal Type" required error={errors.mealType}>
        <select
          value={form.mealType}
          onChange={(e) => set('mealType', e.target.value as MealType)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select Meal Type</option>
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
