'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export default function PlatformSetupPage() {
  const [token, setToken] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subdomain: string; username: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await api.bootstrapPlatform({ token, adminFullName, adminEmail, adminUsername, adminPassword });
      setResult(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create the platform account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
      <div className="w-full max-w-md">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">One-time setup</p>
          <h1 className="text-2xl font-semibold">Create Platform Operator Account</h1>
          <p className="mt-2 text-sm text-slate-500">
            This creates the one account that approves module requests and sees every registered club. It only works once —
            the server refuses this if a platform account already exists — and requires the <code className="text-slate-400">PLATFORM_BOOTSTRAP_TOKEN</code>{' '}
            configured in the server&apos;s environment.
          </p>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {result ? (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950 p-6 text-sm text-emerald-300">
            <p className="font-medium">Platform account created.</p>
            <p className="mt-2 text-emerald-200">
              Sign in at the <code className="text-emerald-100">{result.subdomain}</code> subdomain with username{' '}
              <span className="font-semibold">{result.username}</span>.
            </p>
            <Link href="/login" className="mt-4 inline-block text-emerald-400 underline">
              Go to login →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Bootstrap Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                placeholder="Matches PLATFORM_BOOTSTRAP_TOKEN on the server"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Full Name</label>
              <input
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Username</label>
              <input
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                minLength={3}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Platform Account'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
