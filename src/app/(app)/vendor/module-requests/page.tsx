'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ModuleRequest } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function VendorModuleRequestsPage() {
  const requireLogin = useRequireLogin();
  const [requests, setRequests] = useState<ModuleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    try {
      setRequests(await api.listVendorModuleRequests());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load module requests');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(request: ModuleRequest) {
    setBusyId(request.id);
    setError(null);
    try {
      await api.approveModuleRequest(request.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to approve request');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject(request: ModuleRequest) {
    setBusyId(request.id);
    setError(null);
    try {
      await api.rejectModuleRequest(request.id, rejectNote || undefined);
      setRejectingId(null);
      setRejectNote('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to reject request');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Vendor</p>
          <h1 className="text-2xl font-semibold">Pending Module Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Clubs requesting a module across every tenant on this deployment.</p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {request.tenant?.name ?? request.tenantId}
                      <span className="ml-2 text-xs text-slate-500">({request.tenant?.subdomain})</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      requested <span className="font-medium text-slate-200">{request.moduleKey}</span> — by{' '}
                      {request.requestedBy}, {formatDateTime(request.requestedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={busyId === request.id}
                      className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === request.id ? null : request.id)}
                      className="rounded border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {rejectingId === request.id && (
                  <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
                    <input
                      placeholder="Reason (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => submitReject(request)}
                      disabled={busyId === request.id}
                      className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-600 disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
