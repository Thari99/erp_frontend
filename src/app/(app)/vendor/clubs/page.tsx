'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type VendorClub } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function VendorClubsPage() {
  const requireLogin = useRequireLogin();
  const [clubs, setClubs] = useState<VendorClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setClubs(await api.listVendorClubs());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load clubs');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clubs;
    return clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(needle) ||
        club.subdomain.toLowerCase().includes(needle) ||
        club.modules.some((module) => module.isEnabled && module.displayName.toLowerCase().includes(needle)),
    );
  }, [clubs, query]);

  // Platform-wide totals, so the header answers "how big is this deployment" at a glance.
  const totals = useMemo(() => {
    const moduleUsage = new Map<string, number>();
    for (const club of clubs) {
      for (const module of club.modules) {
        if (module.isEnabled) {
          moduleUsage.set(module.displayName, (moduleUsage.get(module.displayName) ?? 0) + 1);
        }
      }
    }
    return {
      clubs: clubs.length,
      active: clubs.filter((club) => club.isActive).length,
      members: clubs.reduce((sum, club) => sum + club.counts.members, 0),
      pending: clubs.reduce((sum, club) => sum + club.pendingRequestCount, 0),
      moduleUsage: [...moduleUsage.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [clubs]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-400">Vendor</p>
            <h1 className="text-2xl font-semibold">Registered Clubs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every club and restaurant on this deployment, with the modules each one has activated.
            </p>
          </div>
          {totals.pending > 0 && (
            <Link
              href="/vendor/module-requests"
              className="rounded border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-400 hover:border-amber-500"
            >
              {totals.pending} pending request{totals.pending === 1 ? '' : 's'}
            </Link>
          )}
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : clubs.length === 0 ? (
          <p className="text-sm text-slate-500">No clubs have registered yet.</p>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Clubs', value: totals.clubs },
                { label: 'Active', value: totals.active },
                { label: 'Members', value: totals.members },
                { label: 'Pending requests', value: totals.pending },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-100">{stat.value}</p>
                </div>
              ))}
            </section>

            {totals.moduleUsage.length > 0 && (
              <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Module adoption</p>
                <div className="flex flex-wrap gap-2">
                  {totals.moduleUsage.map(([name, count]) => (
                    <span key={name} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {name} <span className="text-emerald-400">{count}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <input
              placeholder="Filter by club, subdomain, or active module…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-500"
            />

            {visible.length === 0 ? (
              <p className="text-sm text-slate-500">No club matches “{query}”.</p>
            ) : (
              <ul className="space-y-3">
                {visible.map((club) => {
                  const enabled = club.modules.filter((module) => module.isEnabled);
                  const disabled = club.modules.filter((module) => !module.isEnabled);

                  return (
                    <li key={club.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
                            {club.name}
                            <span className="text-xs font-normal text-slate-500">{club.subdomain}</span>
                            {!club.isActive && (
                              <span className="rounded bg-red-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-400">
                                Inactive
                              </span>
                            )}
                            {club.pendingRequestCount > 0 && (
                              <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                                {club.pendingRequestCount} pending
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Registered {formatDate(club.createdAt)}
                            {club.email && <> · {club.email}</>}
                            {club.phone && <> · {club.phone}</>}
                          </p>
                          {club.address && <p className="mt-0.5 text-xs text-slate-600">{club.address}</p>}
                        </div>

                        <div className="flex shrink-0 gap-4 text-right text-xs text-slate-500">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{club.counts.users}</p>
                            users
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{club.counts.members}</p>
                            members
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{club.counts.bookings}</p>
                            bookings
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-800 pt-3">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                          Activated modules{' '}
                          <span className="text-slate-400">
                            {enabled.length}/{club.modules.length}
                          </span>
                        </p>

                        {enabled.length === 0 ? (
                          <p className="text-xs text-slate-600">None activated yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {enabled.map((module) => (
                              <span
                                key={module.moduleKey}
                                // Hover reveals the audit trail the registry already stores.
                                title={
                                  module.enabledAt
                                    ? `Enabled ${formatDateTime(module.enabledAt)}${module.enabledBy ? ` by ${module.enabledBy}` : ''}`
                                    : 'Enabled'
                                }
                                className="rounded bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400"
                              >
                                {module.displayName}
                              </span>
                            ))}
                          </div>
                        )}

                        {disabled.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {disabled.map((module) => (
                              <span
                                key={module.moduleKey}
                                className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500"
                              >
                                {module.displayName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
