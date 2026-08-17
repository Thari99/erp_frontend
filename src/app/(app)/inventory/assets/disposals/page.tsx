'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PhysicalAssetDisposal, type PhysicalAssetDisposalStatus } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_STYLES: Record<PhysicalAssetDisposalStatus, string> = {
  PENDING: 'bg-amber-950 text-amber-400',
  APPROVED: 'bg-emerald-950 text-emerald-400',
  REJECTED: 'bg-red-950 text-red-400',
};

export default function AssetDisposalsPage() {
  const requireLogin = useRequireLogin();
  const [disposals, setDisposals] = useState<PhysicalAssetDisposal[]>([]);
  const [statusFilter, setStatusFilter] = useState<PhysicalAssetDisposalStatus | ''>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDisposals(await api.listAssetDisposals(statusFilter || undefined));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load disposal requests');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin, statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  async function resolve(disposal: PhysicalAssetDisposal, status: 'APPROVED' | 'REJECTED') {
    if (!window.confirm(`${status === 'APPROVED' ? 'Approve' : 'Reject'} disposal of ${disposal.unit.unitCode}?`)) return;
    setBusyId(disposal.id);
    setError(null);
    try {
      await api.resolveAssetDisposal(disposal.id, { status });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to resolve disposal request');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Inventory · Physical Stock</p>
            <h1 className="text-2xl font-semibold">Disposal Requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              This is the approval queue. To request disposal of a unit, go to{' '}
              <Link href="/inventory/assets" className="text-emerald-400 underline">
                Manage Assets
              </Link>
              , expand the asset, and use "Request Disposal" on the unit.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PhysicalAssetDisposalStatus | '')}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : disposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    {statusFilter === 'PENDING' ? (
                      <>
                        Nothing pending —{' '}
                        <Link href="/inventory/assets" className="text-emerald-400 underline">
                          request a disposal from Manage Assets
                        </Link>
                        .
                      </>
                    ) : (
                      'No disposal requests.'
                    )}
                  </td>
                </tr>
              ) : (
                disposals.map((disposal) => (
                  <tr key={disposal.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{disposal.unit.unitCode}</td>
                    <td className="px-4 py-3">{disposal.unit.asset.name}</td>
                    <td className="px-4 py-3 text-slate-400">{disposal.reason}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDateTime(disposal.createdAt)}
                      {disposal.removedBy && <span className="text-slate-600"> · {disposal.removedBy}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[disposal.status]}`}>
                        {disposal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {disposal.status === 'PENDING' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => resolve(disposal, 'APPROVED')}
                            disabled={busyId === disposal.id}
                            className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => resolve(disposal, 'REJECTED')}
                            disabled={busyId === disposal.id}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
