'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PayrollDepartment, type PayrollEmployee, type PayrollJobPosition } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium text-slate-200">
        {label}:{required && <span className="text-red-400"> *</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

const inputClass = 'w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm';

export default function RegisterEmployeePage() {
  const requireLogin = useRequireLogin();
  const [departments, setDepartments] = useState<PayrollDepartment[]>([]);
  const [positions, setPositions] = useState<PayrollJobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PayrollEmployee | null>(null);

  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [address, setAddress] = useState('');
  const [nic, setNic] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [landNumber, setLandNumber] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [epfNumber, setEpfNumber] = useState('');
  const [etfNumber, setEtfNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [remark, setRemark] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [departmentList, positionList] = await Promise.all([api.listPayrollDepartments(), api.listPayrollJobPositions()]);
      setDepartments(departmentList);
      setPositions(positionList);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setIsSaving(true);
    try {
      const employee = await api.createPayrollEmployee({
        title: title || undefined,
        firstName,
        lastName,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        address: address || undefined,
        nic: nic || undefined,
        email: email || undefined,
        dob: dob || undefined,
        mobile: mobile || undefined,
        landNumber: landNumber || undefined,
        joinDate: joinDate || undefined,
        epfNumber: epfNumber || undefined,
        etfNumber: etfNumber || undefined,
        emergencyContact: emergencyContact || undefined,
        remark: remark || undefined,
      });
      setTitle('');
      setFirstName('');
      setLastName('');
      setDepartmentId('');
      setPositionId('');
      setAddress('');
      setNic('');
      setEmail('');
      setDob('');
      setMobile('');
      setLandNumber('');
      setJoinDate('');
      setEpfNumber('');
      setEtfNumber('');
      setEmergencyContact('');
      setRemark('');
      setSaved(employee);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to register employee');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Payroll · Employee</p>
          <h1 className="text-2xl font-semibold">Register Employee</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && (
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            Employee registered — <span className="font-semibold">{saved.employeeReference}</span>.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <Field label="Title">
              <input placeholder="e.g. Mr." value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="First Name" required>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
            </Field>
            <Field label="Last Name" required>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} required />
            </Field>
            <Field label="Department">
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job Position">
              <select value={positionId} onChange={(e) => setPositionId(e.target.value)} className={inputClass}>
                <option value="">Select Position</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Address">
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} />
            </Field>
            <Field label="NIC">
              <input value={nic} onChange={(e) => setNic(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Mobile">
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Land Number">
              <input value={landNumber} onChange={(e) => setLandNumber(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Join Date">
              <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="EPF Number">
              <input value={epfNumber} onChange={(e) => setEpfNumber(e.target.value)} className={inputClass} />
            </Field>
            <Field label="ETF Number">
              <input value={etfNumber} onChange={(e) => setEtfNumber(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Emergency Contact">
              <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Remark">
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className={inputClass} />
            </Field>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Records'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
