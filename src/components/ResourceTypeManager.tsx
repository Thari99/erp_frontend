'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

interface TypeRecord {
  id: string;
  name: string;
  memberRate: string;
  nonMemberRate: string;
  isActive: boolean;
}

interface EditState {
  name: string;
  memberRate: string;
  nonMemberRate: string;
}

interface Props {
  itemLabel: string;
  list: () => Promise<TypeRecord[]>;
  create: (input: { name: string; memberRate: number; nonMemberRate: number }) => Promise<TypeRecord>;
  update: (id: string, input: Partial<{ name: string; memberRate: number; nonMemberRate: number; isActive: boolean }>) => Promise<TypeRecord>;
  remove: (id: string) => Promise<{ id: string }>;
  /** Called after any successful create/update/delete — lets a parent page (e.g. Setup)
   *  refresh its own copy of the type list used elsewhere (like a resource's type dropdown). */
  onChanged?: () => void;
  defaultOpen?: boolean;
}

/** Shared, collapsible CRUD panel for RoomType/HallType/BoardroomType — identical shape
 *  (name + member/non-member rate + active flag) across all three, embedded directly in
 *  the Setup Rooms/Halls/Boardrooms page rather than living on separate routes. */
export function ResourceTypeManager({ itemLabel, list, create, update, remove, onChanged, defaultOpen = false }: Props) {
  const requireLogin = useRequireLogin();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [items, setItems] = useState<TypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [memberRate, setMemberRate] = useState('');
  const [nonMemberRate, setNonMemberRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<EditState>({ name: '', memberRate: '', nonMemberRate: '' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await list());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : `Failed to load ${itemLabel.toLowerCase()} types`);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await create({ name, memberRate: Number(memberRate), nonMemberRate: Number(nonMemberRate) });
      setName('');
      setMemberRate('');
      setNonMemberRate('');
      await load();
      onChanged?.();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : `Failed to add ${itemLabel.toLowerCase()} type`);
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(item: TypeRecord) {
    setEditingId(item.id);
    setEditValue({ name: item.name, memberRate: item.memberRate, nonMemberRate: item.nonMemberRate });
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await update(id, {
        name: editValue.name,
        memberRate: Number(editValue.memberRate),
        nonMemberRate: Number(editValue.nonMemberRate),
      });
      setEditingId(null);
      await load();
      onChanged?.();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : `Failed to update ${itemLabel.toLowerCase()} type`);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(item: TypeRecord) {
    setBusyId(item.id);
    setError(null);
    try {
      await update(item.id, { isActive: !item.isActive });
      await load();
      onChanged?.();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : `Failed to update ${itemLabel.toLowerCase()} type`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: TypeRecord) {
    if (!window.confirm(`Delete ${itemLabel.toLowerCase()} type "${item.name}"? This can't be undone.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await remove(item.id);
      await load();
      onChanged?.();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : `Failed to delete ${itemLabel.toLowerCase()} type`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-slate-200">
          Manage {itemLabel} Types {!isLoading && <span className="text-slate-500">({items.length})</span>}
        </span>
        {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 p-4">
          {error && <p className="mb-3 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

          <form onSubmit={handleCreate} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              placeholder={`Name — e.g. ${itemLabel}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Member rate"
              value={memberRate}
              onChange={(e) => setMemberRate(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Non-member rate"
              value={nonMemberRate}
              onChange={(e) => setNonMemberRate(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
              required
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Adding…' : `Add ${itemLabel.toLowerCase()} type`}
            </button>
          </form>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No {itemLabel.toLowerCase()} types yet — add one above.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {items.map((item) => {
                const isEditing = editingId === item.id;
                const isBusy = busyId === item.id;
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    {isEditing ? (
                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          value={editValue.name}
                          onChange={(e) => setEditValue((v) => ({ ...v, name: e.target.value }))}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editValue.memberRate}
                          onChange={(e) => setEditValue((v) => ({ ...v, memberRate: e.target.value }))}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editValue.nonMemberRate}
                          onChange={(e) => setEditValue((v) => ({ ...v, nonMemberRate: e.target.value }))}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm"
                        />
                      </div>
                    ) : (
                      <div>
                        <span className={`font-medium ${item.isActive ? '' : 'text-slate-500 line-through'}`}>{item.name}</span>
                        <div className="text-xs text-slate-500">
                          Member: {Number(item.memberRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} · Non-member:{' '}
                          {Number(item.nonMemberRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          {!item.isActive && <span className="ml-2 text-amber-500">Inactive</span>}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={isBusy}
                            className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(item)}
                            disabled={isBusy}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={isBusy}
                            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
