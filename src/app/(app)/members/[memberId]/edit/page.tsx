'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError, type Member } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';
import { MemberForm } from '@/components/MemberForm';

export default function EditMemberPage() {
  const requireLogin = useRequireLogin();
  const params = useParams<{ memberId: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.memberId) return;
    api
      .getMember(params.memberId)
      .then(setMember)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load member');
      })
      .finally(() => setIsLoading(false));
  }, [params.memberId, requireLogin]);

  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Membership</p>
          <h1 className="text-2xl font-semibold">Edit Member</h1>
        </header>

        {error && <p className="mb-4 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : member ? <MemberForm mode="edit" member={member} /> : null}
      </div>
    </main>
  );
}
