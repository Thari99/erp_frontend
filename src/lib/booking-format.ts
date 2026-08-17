import type { Booking, Payment, ResourceType } from './api';

export const REF_PREFIX_BY_TYPE: Record<ResourceType, string> = {
  ROOM: 'RB',
  HALL: 'HB',
  BOARDROOM: 'BB',
};

/** Human-facing booking reference, e.g. "RB-20260809-715" — derived from the booking's
 *  own check-in date and number rather than stored, so it's stable and needs no migration. */
export function bookingReference(booking: Booking, prefix: string) {
  const datePart = new Date(booking.checkIn).toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${datePart}-${700 + booking.bookingNo}`;
}

/** Same idea for payments/invoices, e.g. "PAY-20260809-3513". */
export function invoiceReference(payment: Payment) {
  const datePart = new Date(payment.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
  return `PAY-${datePart}-${3500 + payment.paymentNo}`;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  MEMBER_SINGLE: 'Member Single',
  MEMBER_DOUBLE: 'Member Double',
  MEMBER_TRIPLE: 'Member Triple',
  MEMBER_FAMILY: 'Member Family',
  NON_MEMBER_SINGLE: 'Non Member Single',
  NON_MEMBER_DOUBLE: 'Non Member Double',
  NON_MEMBER_TRIPLE: 'Non Member Triple',
  NON_MEMBER_FAMILY: 'Non Member Family',
};

/** The single line-item description printed on a receipt, e.g.
 *  "Double Room-Member Single (2026-08-08 - 2026-08-09)". */
export function bookingLineDescription(booking: Booking): string {
  const checkIn = booking.checkIn.slice(0, 10);
  const checkOut = booking.checkOut.slice(0, 10);
  const guestTypeLabel = booking.guestType === 'MEMBER' ? 'Member' : 'Non Member';

  if (booking.resource.type === 'ROOM') {
    const roomTypeName = booking.resource.roomType?.name ?? 'Room';
    const mealLabel = booking.mealType ? (MEAL_TYPE_LABELS[booking.mealType] ?? guestTypeLabel) : guestTypeLabel;
    return `${roomTypeName} Room-${mealLabel} (${checkIn} - ${checkOut})`;
  }
  if (booking.resource.type === 'HALL') {
    const hallTypeName = booking.resource.hallType?.name ?? 'Hall';
    return `${hallTypeName} - ${guestTypeLabel} (${checkIn} - ${checkOut})`;
  }
  const boardroomTypeName = booking.resource.boardroomType?.name ?? 'Boardroom';
  return `${boardroomTypeName} - ${guestTypeLabel} (${checkIn} - ${checkOut})`;
}
