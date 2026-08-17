'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiError, type ModuleCatalogEntry } from '@/lib/api';
import { readFileAsDataUrl } from '@/lib/read-file-as-data-url';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const [modules, setModules] = useState<ModuleCatalogEntry[]>([]);
  const [clubName, setClubName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const [clubAddress, setClubAddress] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subdomain: string; enabledModules: string[] } | null>(null);

  useEffect(() => {
    api.moduleCatalog().then(setModules).catch(() => setModules([]));
  }, []);

  // Auto-derive the subdomain from the club name until the user edits it directly.
  useEffect(() => {
    if (!subdomainTouched) setSubdomain(slugify(clubName));
  }, [clubName, subdomainTouched]);

  useEffect(() => {
    if (!subdomain) {
      setSubdomainAvailable(null);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .subdomainAvailable(subdomain)
        .then((res) => setSubdomainAvailable(res.available))
        .catch(() => setSubdomainAvailable(null));
    }, 400);
    return () => clearTimeout(timeout);
  }, [subdomain]);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setClubLogo(await readFileAsDataUrl(file));
  }

  function toggleModule(moduleKey: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.registerTenant({
        clubName,
        clubAddress: clubAddress || undefined,
        clubPhone: clubPhone || undefined,
        clubEmail: clubEmail || undefined,
        clubLogo: clubLogo || undefined,
        subdomain,
        selectedModules: [...selectedModules],
        adminFullName,
        adminEmail,
        adminUsername,
        adminPassword,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const loginUrl = `${window.location.protocol}//${result.subdomain}.${window.location.host}/login`;
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
        <div className="w-full max-w-md rounded-lg border border-emerald-900 bg-slate-900 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={40} />
          <h1 className="mb-2 text-xl font-semibold">You&apos;re all set</h1>
          <p className="mb-6 text-sm text-slate-400">
            {result.enabledModules.length > 0
              ? `Licensed modules: ${result.enabledModules.join(', ')}`
              : 'Your workspace is ready.'}
          </p>
          <a
            href={loginUrl}
            className="block rounded bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Go to {result.subdomain}.{typeof window !== 'undefined' ? window.location.host : ''} →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-8">
        <h1 className="mb-1 text-xl font-semibold">Register your club or restaurant</h1>
        <p className="mb-6 text-sm text-slate-400">Pick the modules you need, then create your admin login.</p>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <label className="mb-1 block text-sm text-slate-300">Club / Restaurant name</label>
        <input
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          className="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          required
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <input
            placeholder="Address (optional)"
            value={clubAddress}
            onChange={(e) => setClubAddress(e.target.value)}
            className="col-span-2 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone (optional)"
            value={clubPhone}
            onChange={(e) => setClubPhone(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Contact email (optional)"
            value={clubEmail}
            onChange={(e) => setClubEmail(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <label className="col-span-2 flex items-center gap-3 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-400">
            Logo (optional):
            <input type="file" accept="image/*" onChange={handleLogoChange} className="text-xs" />
            {clubLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clubLogo} alt="Logo preview" className="h-8 w-8 rounded bg-white object-contain" />
            )}
          </label>
        </div>

        <label className="mb-1 block text-sm text-slate-300">Subdomain</label>
        <div className="mb-1 flex items-center overflow-hidden rounded border border-slate-700 bg-slate-800">
          <input
            value={subdomain}
            onChange={(e) => {
              setSubdomainTouched(true);
              setSubdomain(slugify(e.target.value));
            }}
            className="w-full bg-transparent px-3 py-2 text-sm outline-none"
            required
          />
          <span className="whitespace-nowrap px-3 text-sm text-slate-500">.yourapp.com</span>
        </div>
        {subdomain && subdomainAvailable !== null && (
          <p
            className={`mb-4 flex items-center gap-1 text-xs ${
              subdomainAvailable ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {subdomainAvailable ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {subdomainAvailable ? 'Available' : 'Already taken'}
          </p>
        )}
        {(!subdomain || subdomainAvailable === null) && <div className="mb-4" />}

        <label className="mb-2 block text-sm text-slate-300">Modules</label>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {modules.map((module) => (
            <label
              key={module.moduleKey}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
                selectedModules.has(module.moduleKey)
                  ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedModules.has(module.moduleKey)}
                onChange={() => toggleModule(module.moduleKey)}
                className="accent-emerald-500"
              />
              {module.displayName}
            </label>
          ))}
        </div>
        <p className="mb-6 text-xs text-slate-500">
          Some modules bring in others they depend on automatically (e.g. Booking also enables Membership).
        </p>

        <div className="mb-4 border-t border-slate-800 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-300">Your admin login</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Full name"
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || subdomainAvailable === false}
          className="w-full rounded bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating your workspace…' : 'Create workspace'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-emerald-400 underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
