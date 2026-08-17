'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type PermissionCatalogEntry, type Role } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function groupLabel(key: string) {
  const prefix = key.split('.')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export default function RolePermissionsPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [role, setRole] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalogEntry[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const [detail, catalogList] = await Promise.all([api.getRole(params.id), api.rolePermissionCatalog()]);
      setRole(detail);
      setCatalog(catalogList);
      setChecked(new Set(detail.permissions.map((p) => p.permission.key)));
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load role permissions');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionCatalogEntry[]>();
    for (const entry of catalog) {
      const label = groupLabel(entry.key);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(entry);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(entries: PermissionCatalogEntry[], selectAll: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const entry of entries) {
        if (selectAll) next.add(entry.key);
        else next.delete(entry.key);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!params.id) return;
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const updated = await api.setRolePermissions(params.id, [...checked]);
      setRole(updated);
      setChecked(new Set(updated.permissions.map((p) => p.permission.key)));
      setSuccess(true);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Administration · Roles</p>
            <h1 className="text-2xl font-semibold">{role ? `${role.name} — Permissions` : 'Permissions'}</h1>
            <p className="mt-1 text-sm text-slate-500">Only permissions for currently enabled modules are shown.</p>
          </div>
          <button onClick={() => router.push('/admin/roles')} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to Roles
          </button>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Permissions saved.</p>}

        {isLoading || !role ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([label, entries]) => {
              const allChecked = entries.every((entry) => checked.has(entry.key));
              return (
                <section key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-200">{label}</h2>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input type="checkbox" checked={allChecked} onChange={(e) => toggleGroup(entries, e.target.checked)} />
                      Toggle all
                    </label>
                  </div>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <label key={entry.key} className="flex items-start gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={checked.has(entry.key)} onChange={() => toggle(entry.key)} className="mt-0.5" />
                        <span>
                          <span className="font-mono text-xs text-slate-500">{entry.key}</span>
                          <br />
                          {entry.description}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}

            {groups.length === 0 && (
              <p className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
                No permissions are available yet — enable a business module for this club first.
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Permissions'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
