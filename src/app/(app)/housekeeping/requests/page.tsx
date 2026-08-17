'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type HousekeepingRequest, type HousekeepingRequestStatus, type ResourceType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const STATUS_CHIP: Record<HousekeepingRequestStatus, string> = {
  NEW: 'bg-sky-950 text-sky-400',
  APPROVED: 'bg-amber-950 text-amber-400',
  ISSUED: 'bg-emerald-950 text-emerald-400',
  CANCELLED: 'bg-slate-800 text-slate-500',
};

const STATUS_LABEL: Record<HousekeepingRequestStatus, string> = {
  NEW: 'New',
  APPROVED: 'Approved',
  ISSUED: 'Issued',
  CANCELLED: 'Cancelled',
};

const TYPE_LABEL: Record<ResourceType, string> = { ROOM: 'Rooms', HALL: 'Hall', BOARDROOM: 'Boardroom' };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HousekeepingRequestsPage() {
  const requireLogin = useRequireLogin();
  const [requests, setRequests] = useState<HousekeepingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | HousekeepingRequestStatus>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    try {
      setRequests(await api.listHousekeepingRequests());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (statusFilter === 'ALL' ? requests : requests.filter((request) => request.status === statusFilter)),
    [requests, statusFilter],
  );

  const counts = useMemo(
    () => ({
      new: requests.filter((r) => r.status === 'NEW').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      issued: requests.filter((r) => r.status === 'ISSUED').length,
    }),
    [requests],
  );

  /** Runs one workflow action and reloads, so the row reflects whatever the server decided. */
  async function act(id: string, action: () => Promise<unknown>, failure: string) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setCancellingId(null);
      setCancelReason('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-400">Housekeeping · Requests</p>
            <h1 className="text-2xl font-semibold">Manage Requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              Approve a request, then issue it — issuing deducts inventory stock and records the movement.
            </p>
          </div>
          <Link
            href="/housekeeping/requests/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            New request
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests raised yet.</p>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-3 gap-3">
              {[
                { label: 'Awaiting approval', value: counts.new },
                { label: 'Approved, not issued', value: counts.approved },
                { label: 'Issued', value: counts.issued },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-100">{tile.value}</p>
                </div>
              ))}
            </section>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | HousekeepingRequestStatus)}
              className="mb-4 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              {(Object.keys(STATUS_LABEL) as HousekeepingRequestStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>

            {visible.length === 0 ? (
              <p className="text-sm text-slate-500">No request with that status.</p>
            ) : (
              <ul className="space-y-3">
                {visible.map((request) => (
                  <li key={request.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
                          {request.requestReference ?? `#${request.requestNo}`}
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[request.status]}`}>
                            {STATUS_LABEL[request.status]}
                          </span>
                          <span className="text-xs font-normal text-slate-500">
                            {request.resource ? request.resource.name : TYPE_LABEL[request.requestedFor]}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Raised by {request.requestedBy}, {formatDateTime(request.requestedAt)}
                        </p>
                        {request.approvedAt && (
                          <p className="text-xs text-slate-600">
                            Approved by {request.approvedBy}, {formatDateTime(request.approvedAt)}
                          </p>
                        )}
                        {request.issuedAt && (
                          <p className="text-xs text-slate-600">
                            Issued by {request.issuedBy}, {formatDateTime(request.issuedAt)}
                            {request.stockOut?.issueReference && (
                              <>
                                {' · '}
                                <Link
                                  href={`/inventory/stock-out/${request.stockOut.id}`}
                                  className="underline hover:text-emerald-400"
                                >
                                  {request.stockOut.issueReference}
                                </Link>
                              </>
                            )}
                          </p>
                        )}
                        {request.cancelledAt && (
                          <p className="text-xs text-slate-600">
                            Cancelled by {request.cancelledBy}, {formatDateTime(request.cancelledAt)}
                          </p>
                        )}
                        {request.note && <p className="mt-1 text-xs text-slate-400">{request.note}</p>}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {request.status === 'NEW' && (
                          <button
                            onClick={() => act(request.id, () => api.approveHousekeepingRequest(request.id), 'Failed to approve')}
                            disabled={busyId === request.id}
                            className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {request.status === 'APPROVED' && (
                          <button
                            onClick={() => act(request.id, () => api.issueHousekeepingRequest(request.id), 'Failed to issue')}
                            disabled={busyId === request.id}
                            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Issue stock
                          </button>
                        )}
                        {(request.status === 'NEW' || request.status === 'APPROVED') && (
                          <button
                            onClick={() => setCancellingId(cancellingId === request.id ? null : request.id)}
                            className="rounded border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-600"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Items</p>
                      <div className="flex flex-wrap gap-1.5">
                        {request.items.map((line) => (
                          <span
                            key={line.id}
                            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                            title={`${line.item.stockQty} in stock now`}
                          >
                            {line.item.name} × {line.quantity}
                            {request.status !== 'ISSUED' && line.quantity > line.item.stockQty && (
                              <span className="ml-1 text-amber-400">short</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {cancellingId === request.id && (
                      <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
                        <input
                          placeholder="Reason (optional)"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
                        />
                        <button
                          onClick={() =>
                            act(
                              request.id,
                              () => api.cancelHousekeepingRequest(request.id, cancelReason || undefined),
                              'Failed to cancel',
                            )
                          }
                          disabled={busyId === request.id}
                          className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-600 disabled:opacity-50"
                        >
                          Confirm cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
