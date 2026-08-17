'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';

export default function ClubProfilePage() {
  const requireLogin = useRequireLogin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getTenantProfile();
      setName(data.name);
      setAddress(data.address ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setLogo(data.logo);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load club profile');
    } finally {
      setIsLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setLogo(dataUrl);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      await api.updateTenantProfile({
        name,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        logo: logo || undefined,
      });
      setNotice('Club profile saved.');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to save club profile');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="px-6 py-10 text-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Club Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            This information is printed on booking receipts — name, address, contact details, and logo.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && (
          <p className="mb-4 rounded border border-emerald-900 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">{notice}</p>
        )}

        <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
            <label className="pt-2 text-sm font-medium text-slate-200">Logo</label>
            <div className="flex items-center gap-4">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Club logo" className="h-16 w-16 rounded border border-slate-700 object-contain bg-white" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-700 text-[10px] text-slate-500">
                  No logo
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
            <label className="pt-2 text-sm font-medium text-slate-200">Club Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
            <label className="pt-2 text-sm font-medium text-slate-200">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="e.g. No:20, Anagarika Dharmapala Mawatha, Kandy"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
            <label className="pt-2 text-sm font-medium text-slate-200">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +94 (0) 812 223 219"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[160px_1fr] sm:gap-4">
            <label className="pt-2 text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. club@example.com"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </main>
  );
}
