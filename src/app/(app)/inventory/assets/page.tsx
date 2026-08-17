'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PhysicalAsset, type PhysicalAssetUnitStatus } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const UNIT_STATUS_DOT: Record<PhysicalAssetUnitStatus, string> = {
  IN_STOCK: 'bg-emerald-500',
  ON_LOAN: 'bg-indigo-500',
  UNDER_MAINTENANCE: 'bg-amber-500',
  DISPOSED: 'bg-slate-600',
};

const UNIT_STATUS_LABEL: Record<PhysicalAssetUnitStatus, string> = {
  IN_STOCK: 'In Stock',
  ON_LOAN: 'On Loan',
  UNDER_MAINTENANCE: 'Under Maintenance',
  DISPOSED: 'Disposed',
};

export default function ManageAssetsPage() {
  const requireLogin = useRequireLogin();
  const [assets, setAssets] = useState<PhysicalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);

  const [transferringUnitId, setTransferringUnitId] = useState<string | null>(null);
  const [transferLocation, setTransferLocation] = useState('');

  const [disposingUnitId, setDisposingUnitId] = useState<string | null>(null);
  const [disposalReason, setDisposalReason] = useState('');

  const load = useCallback(async () => {
    try {
      setAssets(await api.listAssets());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAssetActive(asset: PhysicalAsset) {
    setError(null);
    try {
      await api.updateAsset(asset.id, { isActive: !asset.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update asset');
    }
  }

  async function handleDeleteAsset(asset: PhysicalAsset) {
    if (!window.confirm(`Delete "${asset.name}"?`)) return;
    setError(null);
    try {
      await api.deleteAsset(asset.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete asset');
    }
  }

  function startTransfer(unitId: string) {
    setTransferringUnitId(unitId);
    setDisposingUnitId(null);
    setTransferLocation('');
  }

  async function submitTransfer(unitId: string) {
    if (!transferLocation.trim()) return;
    setBusyUnitId(unitId);
    setError(null);
    try {
      await api.transferAssetUnit(unitId, { toLocation: transferLocation.trim() });
      setTransferringUnitId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to transfer unit');
    } finally {
      setBusyUnitId(null);
    }
  }

  function startDispose(unitId: string) {
    setDisposingUnitId(unitId);
    setTransferringUnitId(null);
    setDisposalReason('');
  }

  async function submitDispose(unitId: string) {
    if (!disposalReason.trim()) return;
    setBusyUnitId(unitId);
    setError(null);
    try {
      await api.requestAssetDisposal(unitId, { reason: disposalReason.trim() });
      setDisposingUnitId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to request disposal');
    } finally {
      setBusyUnitId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Inventory · Physical Stock</p>
            <h1 className="text-2xl font-semibold">Manage Assets</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pending disposals await approval on{' '}
              <Link href="/inventory/assets/disposals" className="text-emerald-400 underline">
                Disposal Requests
              </Link>
              .
            </p>
          </div>
          <Link
            href="/inventory/assets/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + New Asset
          </Link>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Location</th>
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
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No assets yet —{' '}
                    <Link href="/inventory/assets/new" className="text-emerald-400 underline">
                      create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <Fragment key={asset.id}>
                    <tr className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{asset.assetReference ?? `#${asset.assetNo}`}</td>
                      <td className={`px-4 py-3 ${asset.isActive ? '' : 'text-slate-500 line-through'}`}>{asset.name}</td>
                      <td className="px-4 py-3 text-slate-400">{asset.category?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === asset.id ? null : asset.id)} className="text-emerald-400 underline">
                          {asset.units.length} unit{asset.units.length === 1 ? '' : 's'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{asset.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleAssetActive(asset)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            {asset.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === asset.id && (
                      <tr className="border-t border-slate-800 bg-slate-950">
                        <td colSpan={6} className="px-4 py-3">
                          <ul className="space-y-2">
                            {asset.units.map((unit) => (
                              <li key={unit.id} className="rounded border border-slate-800 bg-slate-900 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                  <span className="font-mono text-xs text-slate-300">{unit.unitCode}</span>
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${UNIT_STATUS_DOT[unit.status]}`} />
                                    {UNIT_STATUS_LABEL[unit.status]}
                                  </span>
                                  <span className="text-xs text-slate-500">{unit.location ?? '—'}</span>
                                  {unit.status !== 'DISPOSED' && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => startTransfer(unit.id)}
                                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                                      >
                                        Transfer
                                      </button>
                                      <button
                                        onClick={() => startDispose(unit.id)}
                                        className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600"
                                      >
                                        Request Disposal
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {transferringUnitId === unit.id && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
                                    <input
                                      placeholder="New location"
                                      value={transferLocation}
                                      onChange={(e) => setTransferLocation(e.target.value)}
                                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => submitTransfer(unit.id)}
                                      disabled={busyUnitId === unit.id}
                                      className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setTransferringUnitId(null)}
                                      className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}

                                {disposingUnitId === unit.id && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
                                    <input
                                      placeholder="Reason for disposal"
                                      value={disposalReason}
                                      onChange={(e) => setDisposalReason(e.target.value)}
                                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => submitDispose(unit.id)}
                                      disabled={busyUnitId === unit.id}
                                      className="rounded border border-red-700 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                                    >
                                      Submit Request
                                    </button>
                                    <button
                                      onClick={() => setDisposingUnitId(null)}
                                      className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
