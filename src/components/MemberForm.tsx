'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, type Member, type MemberStatus, type MemberType } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';
import { Field, MemberPicker } from './booking-form-fields';

const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Miss'];

const MEMBER_TYPE_OPTIONS: Array<{ value: MemberType; label: string }> = [
  { value: 'LIFETIME', label: 'Lifetime Member' },
  { value: 'NORMAL', label: 'Normal Member' },
  { value: 'CORPORATE', label: 'Corporate Member' },
  { value: 'COMPLIMENTARY', label: 'Complimentary Member' },
];

const STATUS_OPTIONS: Array<{ value: MemberStatus; label: string }> = [
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEACTIVATED', label: 'Inactive' },
];

function toDateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : '';
}

interface SpecialDateRow {
  description: string;
  date: string;
}

interface Props {
  mode: 'create' | 'edit';
  member?: Member;
}

export function MemberForm({ mode, member }: Props) {
  const requireLogin = useRequireLogin();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMemberId, setSavedMemberId] = useState<string | null>(null);

  const [title, setTitle] = useState(member?.title ?? '');
  const [memberType, setMemberType] = useState<MemberType>(member?.memberType ?? 'NORMAL');
  const [fullName, setFullName] = useState(member?.fullName ?? '');
  const [address, setAddress] = useState(member?.address ?? '');
  const [nic, setNic] = useState(member?.nic ?? '');
  const [dob, setDob] = useState(toDateInput(member?.dob));
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [landNumber, setLandNumber] = useState(member?.landNumber ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [joinDate, setJoinDate] = useState(toDateInput(member?.joinDate) || new Date().toISOString().slice(0, 10));
  const [resignDate, setResignDate] = useState(toDateInput(member?.resignDate));
  const [remark, setRemark] = useState(member?.remark ?? '');
  const [photo, setPhoto] = useState<string | null>(member?.photo ?? null);
  const [referredById, setReferredById] = useState(member?.referredById ?? '');
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? 'UNDER_REVIEW');
  const [specialDates, setSpecialDates] = useState<SpecialDateRow[]>([]);

  useEffect(() => {
    api.listMembers().then(setMembers).catch(() => {});
  }, []);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(await readFileAsDataUrl(file));
  }

  function addSpecialDateRow() {
    setSpecialDates((prev) => [...prev, { description: '', date: '' }]);
  }
  function updateSpecialDateRow(index: number, patch: Partial<SpecialDateRow>) {
    setSpecialDates((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeSpecialDateRow(index: number) {
    setSpecialDates((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const shared = {
        title: title || undefined,
        memberType,
        fullName,
        address: address || undefined,
        nic: nic || undefined,
        dob: dob || undefined,
        phone: phone || undefined,
        landNumber: landNumber || undefined,
        email: email || undefined,
        joinDate: joinDate || undefined,
        remark: remark || undefined,
        photo: photo || undefined,
        referredById: referredById || undefined,
      };

      if (mode === 'create') {
        const created = await api.createMember({
          ...shared,
          status,
          specialDates: specialDates.filter((sd) => sd.description && sd.date),
        });
        setSavedMemberId(created.id);
      } else if (member) {
        await api.updateMember(member.id, { ...shared, resignDate: resignDate || undefined });
        if (status !== member.status) {
          await api.updateMemberStatus(member.id, status);
        }
        setSavedMemberId(member.id);
      }
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save member');
    } finally {
      setIsSaving(false);
    }
  }

  if (savedMemberId) {
    if (typeof window !== 'undefined') window.location.href = `/members/${savedMemberId}`;
    return null;
  }

  const referenceOptions = members.filter((m) => m.id !== member?.id);

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

      <Field label="Profile Photo">
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-16 w-16 rounded border border-slate-700 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-700 text-[10px] text-slate-500">
              No photo
            </div>
          )}
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
        </div>
      </Field>

      <Field label="Title" required>
        <select
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          required
        >
          <option value="">Select Title</option>
          {TITLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Member Type" required>
        <select
          value={memberType}
          onChange={(e) => setMemberType(e.target.value as MemberType)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          {MEMBER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Name with initials" required>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          required
        />
      </Field>

      <Field label="Address">
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="NIC">
        <input
          value={nic}
          onChange={(e) => setNic(e.target.value.toUpperCase())}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Date Of Birth">
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Mobile">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 0771234567"
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Land Number">
        <input
          value={landNumber}
          onChange={(e) => setLandNumber(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Join Date" required>
        <input
          type="date"
          value={joinDate}
          onChange={(e) => setJoinDate(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          required
        />
      </Field>

      {mode === 'edit' && (
        <Field label="Resigned Date">
          <input
            type="date"
            value={resignDate}
            onChange={(e) => setResignDate(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
        </Field>
      )}

      <Field label="Status" required>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MemberStatus)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Remark">
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Reference By">
        <MemberPicker members={referenceOptions} value={referredById} onChange={setReferredById} placeholder="Select referring member" />
      </Field>

      {mode === 'create' && (
        <Field label="Special Dates">
          <div className="space-y-2">
            {specialDates.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  placeholder="Description — e.g. Birthday"
                  value={row.description}
                  onChange={(e) => updateSpecialDateRow(index, { description: e.target.value })}
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateSpecialDateRow(index, { date: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeSpecialDateRow(index)}
                  className="rounded border border-red-900 px-2 text-xs text-red-400 hover:border-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSpecialDateRow}
              className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
            >
              + Add special date
            </button>
          </div>
        </Field>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {isSaving ? 'Saving…' : mode === 'create' ? 'Save Records' : 'Update Records'}
      </button>
    </form>
  );
}
