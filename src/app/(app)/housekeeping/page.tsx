'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  ApiError,
  type HousekeepingPriority,
  type HousekeepingState,
  type HousekeepingStatusRow,
  type ResourceType,
} from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

const STATES: Array<{ value: HousekeepingState; label: string; chip: string }> = [
  { value: 'CLEAN', label: 'Clean', chip: 'bg-emerald-950 text-emerald-400' },
  { value: 'CLEANING', label: 'Cleaning', chip: 'bg-sky-950 text-sky-400' },
  { value: 'DIRTY', label: 'Dirty', chip: 'bg-red-950 text-red-400' },
  { value: 'OUT_OF_SERVICE', label: 'Out of service', chip: 'bg-amber-950 text-amber-400' },
];

const PRIORITIES: Array<{ value: HousekeepingPriority; label: string; className: string }> = [
  { value: 'HIGH', label: 'High', className: 'text-red-400' },
  { value: 'MEDIUM', label: 'Medium', className: 'text-amber-400' },
  { value: 'LOW', label: 'Low', className: 'text-slate-400' },
];

const TYPE_LABEL: Record<ResourceType, string> = { ROOM: 'Room', HALL: 'Hall', BOARDROOM: 'Boardroom' };

function chipFor(state: HousekeepingState) {
  return STATES.find((s) => s.value === state)?.chip ?? 'bg-slate-800 text-slate-400';
}

function labelFor(state: HousekeepingState) {
  return STATES.find((s) => s.value === state)?.label ?? state;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HousekeepingBoardPage() {
  const requireLogin = useRequireLogin();
  const [rows, setRows] = useState<HousekeepingStatusRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ResourceType>('ALL');
  const [stateFilter, setStateFilter] = useState<'ALL' | HousekeepingState>('ALL');

  // Which row has its edit panel open, plus that panel's draft values.
  const [editing, setEditing] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<HousekeepingState>('CLEAN');
  const [draftPriority, setDraftPriority] = useState<HousekeepingPriority>('MEDIUM');
  const [draftReason, setDraftReason] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await api.listHousekeepingStatuses());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load housekeeping board');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  // Counted from the same rows the table renders, so the tiles can never disagree with it.
  const summary = useMemo(
    () => ({
      total: rows.length,
      clean: rows.filter((r) => r.state === 'CLEAN').length,
      cleaning: rows.filter((r) => r.state === 'CLEANING').length,
      dirty: rows.filter((r) => r.state === 'DIRTY').length,
      outOfService: rows.filter((r) => r.state === 'OUT_OF_SERVICE').length,
    }),
    [rows],
  );

  const visible = useMemo(
    () =>
      rows.filter(
        (row) => (typeFilter === 'ALL' || row.type === typeFilter) && (stateFilter === 'ALL' || row.state === stateFilter),
      ),
    [rows, typeFilter, stateFilter],
  );

  function openEditor(row: HousekeepingStatusRow) {
    setEditing(row.resourceId);
    setDraftState(row.state);
    setDraftPriority(row.priority);
    setDraftReason(row.reason ?? '');
    setError(null);
  }

  async function save(resourceId: string) {
    setBusyId(resourceId);
    setError(null);
    try {
      await api.updateHousekeepingStatus(resourceId, {
        state: draftState,
        priority: draftPriority,
        reason: draftReason.trim() || undefined,
      });
      setEditing(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Housekeeping</p>
          <h1 className="text-2xl font-semibold">Cleaning Status</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every room, hall, and boardroom with its current cleaning state and priority.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No locations yet. Add rooms, halls, or boardrooms under Booking → Setup first.
          </p>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Locations', value: summary.total },
                { label: 'Clean', value: summary.clean },
                { label: 'Cleaning', value: summary.cleaning },
                { label: 'Dirty', value: summary.dirty },
                { label: 'Out of service', value: summary.outOfService },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-100">{tile.value}</p>
                </div>
              ))}
            </section>

            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | ResourceType)}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="ALL">All types</option>
                <option value="ROOM">Rooms</option>
                <option value="HALL">Halls</option>
                <option value="BOARDROOM">Boardrooms</option>
              </select>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as 'ALL' | HousekeepingState)}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="ALL">All states</option>
                {STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Reason / note</th>
                    <th className="px-3 py-2 font-medium">Last updated</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                        No location matches these filters.
                      </td>
                    </tr>
                  ) : (
                    visible.map((row) => (
                      // Fragment, not a wrapper element: the editor is its own <tr> below the
                      // data row, and a <div> between <tbody> and <tr> is invalid markup.
                      // Explicit Fragment rather than <> — the key has to live on the
                      // outermost node of a mapped item, and shorthand syntax takes no key.
                      <Fragment key={row.resourceId}>
                        <tr className="border-t border-slate-800 text-slate-200">
                          <td className="px-3 py-2 font-medium text-slate-100">{row.name}</td>
                          <td className="px-3 py-2 text-slate-400">
                            {TYPE_LABEL[row.type]}
                            {row.typeName ? <span className="text-slate-600"> · {row.typeName}</span> : null}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${chipFor(row.state)}`}>
                              {labelFor(row.state)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {/* Priority only means something for work that is outstanding. */}
                            {row.state === 'CLEAN' ? (
                              <span className="text-slate-600">—</span>
                            ) : (
                              <span
                                className={`text-xs font-medium ${
                                  PRIORITIES.find((p) => p.value === row.priority)?.className ?? ''
                                }`}
                              >
                                {PRIORITIES.find((p) => p.value === row.priority)?.label}
                              </span>
                            )}
                          </td>
                          <td className="max-w-xs px-3 py-2 text-slate-400">
                            {row.reason ? row.reason : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {row.isTracked && row.updatedAt ? (
                              <>
                                {formatDateTime(row.updatedAt)}
                                {row.updatedBy ? <span className="text-slate-600"> by {row.updatedBy}</span> : null}
                              </>
                            ) : (
                              <span className="text-slate-600">Never updated</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => (editing === row.resourceId ? setEditing(null) : openEditor(row))}
                              className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                            >
                              {editing === row.resourceId ? 'Close' : 'Update'}
                            </button>
                          </td>
                        </tr>

                        {editing === row.resourceId && (
                          <tr className="border-t border-slate-800 bg-slate-950/60">
                            <td colSpan={7} className="px-3 py-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
                                <div>
                                  <label className="mb-1 block text-xs text-slate-400">Status</label>
                                  <select
                                    value={draftState}
                                    onChange={(e) => setDraftState(e.target.value as HousekeepingState)}
                                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                                  >
                                    {STATES.map((state) => (
                                      <option key={state.value} value={state.value}>
                                        {state.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-slate-400">Priority</label>
                                  <select
                                    value={draftPriority}
                                    onChange={(e) => setDraftPriority(e.target.value as HousekeepingPriority)}
                                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                                  >
                                    {PRIORITIES.map((priority) => (
                                      <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-slate-400">Reason / note</label>
                                  <input
                                    value={draftReason}
                                    onChange={(e) => setDraftReason(e.target.value)}
                                    placeholder="e.g. AC repair pending"
                                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                                  />
                                </div>
                                <button
                                  onClick={() => save(row.resourceId)}
                                  disabled={busyId === row.resourceId}
                                  className="self-end rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  {busyId === row.resourceId ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
