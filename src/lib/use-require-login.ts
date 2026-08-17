'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from './api';

/** Redirects to /login on a 401 and reports whether it did — callers skip their own error handling when it did. */
export function useRequireLogin() {
  const router = useRouter();
  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return true;
      }
      return false;
    },
    [router],
  );
}
