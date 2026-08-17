'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, type InventoryStockOut } from '@/lib/api';
import { useRequireLogin } from '@/lib/use-require-login';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function InventoryStockOutDetailPage() {
  return (
    <Suspense fallback={null}>
      <InventoryStockOutDetailPageContent />
    </Suspense>
  );
}

function InventoryStockOutDetailPageContent() {
  const requireLogin = useRequireLogin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoprint = searchParams.get('autoprint') === '1';
  const hasAutoPrinted = useRef(false);

  const [issue, setIssue] = useState<InventoryStockOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getInventoryStockOut(params.id)
      .then(setIssue)
      .catch((err) => {
        if (!requireLogin(err)) setError(err instanceof ApiError ? err.message : 'Failed to load stock-out record');
      })
      .finally(() => setIsLoading(false));
  }, [params.id, requireLogin]);

  useEffect(() => {
    if (autoprint && issue && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [autoprint, issue]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !issue) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>{error ?? 'Stock-out record not found'}</p>
      </main>
    );
  }

  const total = issue.items.reduce((sum, line) => sum + Number(line.total), 0);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50 print:bg-white print:px-0 print:text-black">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Print
          </button>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 print:border-black print:bg-white">
          <div className="mb-4 text-center">
            <p className="text-sm text-emerald-400 print:text-black">Stock Issue Note</p>
            <h1 className="text-xl font-semibold">{issue.issueReference ?? `#${issue.issueNo}`}</h1>
          </div>

          <div className="mb-4 space-y-1 text-xs text-slate-400 print:text-slate-700">
            <p>Date: {formatDateTime(issue.createdAt)}</p>
            <p>Issued to: {issue.issuedTo}</p>
            {issue.issuedBy && <p>Issued by: {issue.issuedBy}</p>}
          </div>

          <div className="border-t border-slate-800 py-3 print:border-black">
            {issue.items.map((line) => (
              <div key={line.id} className="mb-1 flex justify-between text-sm">
                <span className="text-slate-200">
                  {line.quantity} × {line.item.name}
                </span>
                <span>Rs. {Number(line.total).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-semibold text-slate-100 print:border-black">
            <span>Total Value</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>

          {issue.remark && (
            <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500 print:border-black">Remark: {issue.remark}</p>
          )}
        </div>
      </div>
    </main>
  );
}
