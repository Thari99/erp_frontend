'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import { api, ApiError, type Member, type MemberStatus, type MemberType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { ActionsMenu } from '@/components/ActionsMenu';
import { toCsv, downloadCsv } from '@/lib/csv';

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  LIFETIME: 'Lifetime Member',
  NORMAL: 'Normal Member',
  CORPORATE: 'Corporate Member',
  COMPLIMENTARY: 'Complimentary Member',
};

const MEMBER_TYPE_STYLES: Record<MemberType, string> = {
  LIFETIME: 'bg-emerald-950 text-emerald-400',
  NORMAL: 'bg-slate-800 text-slate-400',
  CORPORATE: 'bg-indigo-950 text-indigo-400',
  COMPLIMENTARY: 'bg-amber-950 text-amber-400',
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  UNDER_REVIEW: 'Under Review',
  ACTIVE: 'Activated',
  DEACTIVATED: 'Deactivated',
};

const STATUS_DOT_COLORS: Record<MemberStatus, string> = {
  UNDER_REVIEW: 'bg-amber-500',
  ACTIVE: 'bg-emerald-500',
  DEACTIVATED: 'bg-slate-500',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

interface ExportColumn {
  key: string;
  label: string;
  value: (member: Member) => string;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'memberReference', label: 'Member ID', value: (m) => m.memberReference ?? `#${m.memberNo}` },
  { key: 'title', label: 'Title', value: (m) => m.title ?? '' },
  { key: 'fullName', label: 'Name', value: (m) => m.fullName },
  { key: 'memberType', label: 'Member Type', value: (m) => MEMBER_TYPE_LABELS[m.memberType] },
  { key: 'status', label: 'Status', value: (m) => STATUS_LABELS[m.status] },
  { key: 'address', label: 'Address', value: (m) => m.address ?? '' },
  { key: 'nic', label: 'NIC', value: (m) => m.nic ?? '' },
  { key: 'dob', label: 'Date of Birth', value: (m) => formatDate(m.dob) },
  { key: 'phone', label: 'Mobile', value: (m) => m.phone ?? '' },
  { key: 'landNumber', label: 'Land Number', value: (m) => m.landNumber ?? '' },
  { key: 'email', label: 'Email', value: (m) => m.email ?? '' },
  { key: 'joinDate', label: 'Join Date', value: (m) => formatDate(m.joinDate) },
  { key: 'resignDate', label: 'Resigned Date', value: (m) => formatDate(m.resignDate) },
  { key: 'referredBy', label: 'Reference By', value: (m) => (m.referredBy ? m.referredBy.fullName : '') },
  { key: 'remark', label: 'Remark', value: (m) => m.remark ?? '' },
];

export default function MembersPage() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<MemberType | ''>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(EXPORT_COLUMNS.map((c) => c.key)));

  const load = useCallback(async () => {
    try {
      setMembers(await api.listMembers());
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (typeFilter && m.memberType !== typeFilter) return false;
      if (!q) return true;
      return [m.memberReference, m.fullName, m.nic, m.phone, m.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [members, search, statusFilter, typeFilter]);

  function toggleColumn(key: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function exportCsv() {
    const columns = EXPORT_COLUMNS.filter((c) => selectedColumns.has(c.key));
    if (columns.length === 0) return;
    const rows = [columns.map((c) => c.label), ...filtered.map((member) => columns.map((c) => c.value(member)))];
    downloadCsv(`members-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    setIsExportOpen(false);
  }

  async function handleDelete(member: Member) {
    if (!window.confirm(`Delete member "${member.fullName}"? This can't be undone.`)) return;
    setBusyId(member.id);
    setError(null);
    try {
      await api.deleteMember(member.id);
      await load();
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to delete member');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-400">Membership</p>
            <h1 className="text-2xl font-semibold">Members</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsExportOpen((v) => !v)}
                className="flex items-center gap-2 rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                <Download size={14} />
                Export CSV
              </button>
              {isExportOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Columns to include</p>
                  <div className="mb-3 max-h-56 space-y-1 overflow-y-auto">
                    {EXPORT_COLUMNS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="accent-emerald-500"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={exportCsv}
                    disabled={selectedColumns.size === 0}
                    className="w-full rounded bg-emerald-600 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Download ({filtered.length} members)
                  </button>
                </div>
              )}
            </div>
            <Link
              href="/members/new"
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              + New Member
            </Link>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full rounded border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemberStatus | '')}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MemberType | '')}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">All Member Types</option>
            {Object.entries(MEMBER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {(statusFilter || typeFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setSearch('');
              }}
              className="text-xs text-slate-400 underline hover:text-slate-200"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-hidden rounded-lg border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Photo</th>
                  <th className="px-4 py-3 font-medium">Member ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Birthday</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Join Date</th>
                  <th className="px-4 py-3 font-medium">Member Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      No members match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => (
                    <tr key={member.id} className="text-slate-200 hover:bg-slate-900/60">
                      <td className="px-4 py-3">
                        {member.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.photo} alt="" className="h-9 w-9 rounded-full border border-slate-700 object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-medium text-slate-500">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{member.memberReference ?? `#${member.memberNo}`}</td>
                      <td className="px-4 py-3">
                        <Link href={`/members/${member.id}`} className="hover:text-emerald-400">
                          {member.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatDate(member.dob)}</td>
                      <td className="px-4 py-3">{member.phone ?? '—'}</td>
                      <td className="px-4 py-3">{member.email ?? '—'}</td>
                      <td className="px-4 py-3">{formatDate(member.joinDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${MEMBER_TYPE_STYLES[member.memberType]}`}>
                          {MEMBER_TYPE_LABELS[member.memberType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-300">
                          <span className={`h-1.5 w-1.5 flex-none rounded-full ${STATUS_DOT_COLORS[member.status]}`} />
                          {STATUS_LABELS[member.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ActionsMenu
                          items={[
                            { label: 'View Profile', onClick: () => router.push(`/members/${member.id}`) },
                            { label: 'Edit', onClick: () => router.push(`/members/${member.id}/edit`) },
                            {
                              label: 'Delete',
                              danger: true,
                              disabled: busyId === member.id,
                              onClick: () => handleDelete(member),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
