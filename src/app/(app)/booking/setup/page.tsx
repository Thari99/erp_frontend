'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type BoardroomType, type BookableResource, type HallType, type ResourceType, type RoomType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { ResourceTypeManager } from '@/components/ResourceTypeManager';

const TYPE_OPTIONS: Array<{ value: ResourceType; label: string }> = [
  { value: 'ROOM', label: 'Room' },
  { value: 'HALL', label: 'Hall' },
  { value: 'BOARDROOM', label: 'Boardroom' },
];

// Which field each resource type stores its package/type in.
const TYPE_FIELD: Record<ResourceType, 'roomTypeId' | 'hallTypeId' | 'boardroomTypeId'> = {
  ROOM: 'roomTypeId',
  HALL: 'hallTypeId',
  BOARDROOM: 'boardroomTypeId',
};

// Props for the embedded type-manager panel rendered inside each resource-kind section.
const TYPE_MANAGERS: Record<
  ResourceType,
  { itemLabel: string } & Pick<Parameters<typeof ResourceTypeManager>[0], 'list' | 'create' | 'update' | 'remove'>
> = {
  ROOM: { itemLabel: 'Room', list: api.listRoomTypes, create: api.createRoomType, update: api.updateRoomType, remove: api.deleteRoomType },
  HALL: { itemLabel: 'Hall', list: api.listHallTypes, create: api.createHallType, update: api.updateHallType, remove: api.deleteHallType },
  BOARDROOM: {
    itemLabel: 'Boardroom',
    list: api.listBoardroomTypes,
    create: api.createBoardroomType,
    update: api.updateBoardroomType,
    remove: api.deleteBoardroomType,
  },
};

// Display label for the current type/package — shown inline in the resource list.
function resourceTypeLabel(resource: BookableResource): string | null {
  return resource.roomType?.name ?? resource.hallType?.name ?? resource.boardroomType?.name ?? null;
}

// The raw value the "Edit type" select should be pre-filled with and submit.
function resourceTypeEditValue(resource: BookableResource): string {
  return resource.roomTypeId ?? resource.hallTypeId ?? resource.boardroomTypeId ?? '';
}

export default function BookingSetupPage() {
  const requireLogin = useRequireLogin();
  const [resources, setResources] = useState<BookableResource[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [hallTypes, setHallTypes] = useState<HallType[]>([]);
  const [boardroomTypes, setBoardroomTypes] = useState<BoardroomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ResourceType>('ROOM');
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [resourceList, roomTypeList, hallTypeList, boardroomTypeList] = await Promise.all([
        api.listResources(),
        api.listRoomTypes(),
        api.listHallTypes(),
        api.listBoardroomTypes(),
      ]);
      setResources(resourceList);
      setRoomTypes(roomTypeList);
      setHallTypes(hallTypeList);
      setBoardroomTypes(boardroomTypeList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const activeOptionsByType: Record<ResourceType, Array<{ value: string; label: string }>> = {
    ROOM: roomTypes.filter((rt) => rt.isActive).map((rt) => ({ value: rt.id, label: rt.name })),
    HALL: hallTypes.filter((ht) => ht.isActive).map((ht) => ({ value: ht.id, label: ht.name })),
    BOARDROOM: boardroomTypes.filter((bt) => bt.isActive).map((bt) => ({ value: bt.id, label: bt.name })),
  };
  const currentOptions = activeOptionsByType[type];

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await api.createResource({
        type,
        name,
        [TYPE_FIELD[type]]: typeId || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setName('');
      setTypeId('');
      setCapacity('');
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to add resource');
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(resource: BookableResource) {
    setEditingId(resource.id);
    setEditingValue(resourceTypeEditValue(resource));
  }

  async function saveEdit(resource: BookableResource) {
    if (!editingValue) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      await api.updateResource(resource.id, { [TYPE_FIELD[resource.type]]: editingValue } as never);
      setEditingId(null);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update resource');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleActive(resource: BookableResource) {
    setTogglingId(resource.id);
    setError(null);
    try {
      await api.updateResource(resource.id, { isActive: !resource.isActive });
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to update resource');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(resource: BookableResource) {
    if (!window.confirm(`Delete "${resource.name}"? This can't be undone.`)) return;
    setDeletingId(resource.id);
    setError(null);
    try {
      await api.deleteResource(resource.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete resource');
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = TYPE_OPTIONS.map((t) => ({
    ...t,
    items: resources.filter((r) => r.type === t.value),
  }));

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Booking</p>
          <h1 className="text-2xl font-semibold">Setup Rooms / Halls / Boardrooms</h1>
          <p className="mt-1 text-sm text-slate-500">
            New workspaces start with none — add what you actually have before taking bookings.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Add a resource</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as ResourceType);
                setTypeId('');
              }}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Name — e.g. Room 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
              required
            />
            {currentOptions.length === 0 ? (
              <p className="text-xs text-slate-500 sm:col-span-1">
                No {TYPE_MANAGERS[type].itemLabel.toLowerCase()} types yet — add one in the panel below.
              </p>
            ) : (
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
                required
              >
                <option value="">{TYPE_OPTIONS.find((o) => o.value === type)?.label} type</option>
                {currentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              placeholder="Capacity (optional)"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
              min={1}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:col-span-4"
            >
              {isSaving ? 'Adding…' : 'Add resource'}
            </button>
          </form>
        </section>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          grouped.map((group) => (
            <section key={group.value} className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
                {group.label} ({group.items.length})
              </h2>

              <ResourceTypeManager {...TYPE_MANAGERS[group.value]} onChanged={load} />

              {group.items.length === 0 ? (
                <p className="text-sm text-slate-500">None yet.</p>
              ) : (
                <ul className="space-y-2">
                  {group.items.map((resource) => {
                    const typeValue = resourceTypeLabel(resource);
                    const isEditing = editingId === resource.id;
                    return (
                      <li
                        key={resource.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                      >
                        <div>
                          <span className={resource.isActive ? '' : 'text-slate-500 line-through'}>{resource.name}</span>
                          {typeValue ? (
                            <span className="text-slate-500"> · {typeValue}</span>
                          ) : (
                            <span className="ml-2 rounded bg-amber-950 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-amber-400">
                              No type set — can&apos;t be booked yet
                            </span>
                          )}
                          {resource.capacity && <span className="text-slate-500"> · cap {resource.capacity}</span>}
                          {!resource.isActive && <span className="ml-2 text-xs text-amber-500">Inactive</span>}
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs"
                            >
                              <option value="">Select…</option>
                              {activeOptionsByType[resource.type].map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveEdit(resource)}
                              disabled={isSavingEdit || !editingValue}
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
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(resource)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                            >
                              Edit type
                            </button>
                            <button
                              onClick={() => toggleActive(resource)}
                              disabled={togglingId === resource.id}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                            >
                              {resource.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(resource)}
                              disabled={deletingId === resource.id}
                              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:border-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
