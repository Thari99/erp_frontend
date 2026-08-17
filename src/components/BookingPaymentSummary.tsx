'use client';

import { useMemo, useState } from 'react';
import { api, ApiError, type Booking } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { Field } from './booking-form-fields';

const DEBIT_ACCOUNT_BY_METHOD: Record<'CASH' | 'CARD' | 'BANK_TRANSFER', string> = {
  CASH: '1000',
  CARD: '4000',
  BANK_TRANSFER: '1010',
};

function money(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface BookingPricingInput {
  description?: string;
  remark?: string;
  subtotal: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  discount: number;
  advance: number;
  netAmount: number;
}

interface Props {
  title?: string;
  summaryRows: Array<{ label: string; value: string }>;
  subtotal: number;
  onCreateBooking: (pricing: BookingPricingInput) => Promise<Booking>;
  onFinalized: (booking: Booking) => void;
  onBack: () => void;
}

/**
 * The pricing-review + payment step shown after "Save Records" passes validation, shared
 * across Room/Hall/Boardroom booking — only the summary rows and the base subtotal differ
 * per form; service charge/discount/advance math and the create-then-pay flow are identical.
 */
export function BookingPaymentSummary({ title = 'Booking Summary', summaryRows, subtotal, onCreateBooking, onFinalized, onBack }: Props) {
  const requireLogin = useRequireLogin();
  const [description, setDescription] = useState('');
  const [remark, setRemark] = useState('');
  const [serviceChargePercent, setServiceChargePercent] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [advance, setAdvance] = useState('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');

  const pricing = useMemo(() => {
    const serviceChargeAmount = subtotal * ((Number(serviceChargePercent) || 0) / 100);
    const grandTotal = subtotal + serviceChargeAmount;
    const discountNum = Number(discount) || 0;
    const advanceNum = Number(advance) || 0;
    const netAmount = Math.max(0, grandTotal - discountNum - advanceNum);
    return { serviceChargeAmount, grandTotal, discountNum, advanceNum, netAmount };
  }, [subtotal, serviceChargePercent, discount, advance]);

  /**
   * Creates the booking (once) and, if an advance was taken, records a payment for that
   * advance only — netAmount is what's still owed and stays outstanding until Checkout,
   * it is NOT collected here. Safe to retry after a payment-recording failure —
   * createdBooking short-circuits a second create call.
   */
  async function finalize() {
    setApiError(null);
    setIsFinalizing(true);
    try {
      let booking = createdBooking;
      if (!booking) {
        booking = await onCreateBooking({
          description: description || undefined,
          remark: remark || undefined,
          subtotal,
          serviceChargePercent: Number(serviceChargePercent) || 0,
          serviceChargeAmount: pricing.serviceChargeAmount,
          discount: pricing.discountNum,
          advance: pricing.advanceNum,
          netAmount: pricing.netAmount,
        });
        setCreatedBooking(booking);
      }

      if (pricing.advanceNum > 0) {
        await api.recordPayment({
          reference: `BOOKING:${booking.id}`,
          amount: pricing.advanceNum,
          method,
          debitAccountCode: DEBIT_ACCOUNT_BY_METHOD[method],
          creditAccountCode: '1100',
        });
      }

      onFinalized(booking);
    } catch (err) {
      if (!requireLogin(err)) setApiError(err instanceof ApiError ? err.message : 'Failed to complete booking');
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      {apiError && <p className="rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{apiError}</p>}

      <div className="grid grid-cols-1 gap-6 rounded-lg border border-slate-800 bg-slate-900 p-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
          <dl className="space-y-2 border-b border-slate-800 pb-4 text-sm">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex justify-between">
                <dt className="font-medium text-slate-200">{row.label}:</dt>
                <dd className="text-slate-300">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 space-y-3">
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Remark">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </div>

        <div>
          <div className="space-y-3">
            <Field label="Subtotal Rs.">
              <input readOnly value={money(subtotal)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300" />
            </Field>
            <Field label="Service Charge (%)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Service Charge Amount Rs.">
              <input
                readOnly
                value={money(pricing.serviceChargeAmount)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
              />
            </Field>
            <Field label="Grand Total Rs.">
              <input
                readOnly
                value={money(pricing.grandTotal)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
              />
            </Field>
            <Field label="Discount Rs.">
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Advance">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Net Amount:">
              <input
                readOnly
                value={money(pricing.netAmount)}
                className="w-full rounded border border-emerald-800 bg-slate-800 px-3 py-2 text-sm font-semibold text-emerald-300"
              />
            </Field>
          </div>

          {pricing.advanceNum > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  ['CASH', 'Cash'],
                  ['CARD', 'Card'],
                  ['BANK_TRANSFER', 'Bank'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  disabled={isFinalizing}
                  className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                    method === value
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={finalize}
              disabled={isFinalizing}
              className="rounded bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isFinalizing ? 'Saving…' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={isFinalizing}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
