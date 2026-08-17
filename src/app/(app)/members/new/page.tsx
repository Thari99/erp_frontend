'use client';

import { MemberForm } from '@/components/MemberForm';

export default function NewMemberPage() {
  return (
    <main className="px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Membership</p>
          <h1 className="text-2xl font-semibold">Register Member</h1>
        </header>
        <MemberForm mode="create" />
      </div>
    </main>
  );
}
