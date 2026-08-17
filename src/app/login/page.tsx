'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, currentSubdomain } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anything based on window.location must wait for the client mount — the server render
  // pass has no window, so computing this eagerly would mismatch during hydration.
  const [subdomain, setSubdomain] = useState<string | undefined>(undefined);
  const [registerHref, setRegisterHref] = useState('/register');
  useEffect(() => {
    setSubdomain(currentSubdomain());
    setRegisterHref(`${window.location.protocol}//${window.location.host.replace(/^[^.]+\./, '')}/register`);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { accessToken } = await api.login(username, password);
      localStorage.setItem('accessToken', accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-50">Module ERP</h1>
        <p className="mb-6 text-sm text-slate-400">{subdomain ? `Signing in to ${subdomain}` : 'Platform Core'}</p>

        <label className="mb-1 block text-sm text-slate-300" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 outline-none focus:border-emerald-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mb-1 block text-sm text-slate-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="mb-6 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 outline-none focus:border-emerald-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          New club or restaurant?{' '}
          <Link href={registerHref} className="text-emerald-400 underline">
            Register here
          </Link>
        </p>
      </form>
    </main>
  );
}
