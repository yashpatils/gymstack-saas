'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { confirmDeleteAccount, logout } from '../../src/lib/auth';

type DeleteState = 'processing' | 'success' | 'error';

export default function ConfirmDeleteAccountClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<DeleteState>('processing');
  const [message, setMessage] = useState('Confirming account deletion...');

  useEffect(() => {
    async function run() {
      if (!token) {
        setState('error');
        setMessage('Delete confirmation token missing.');
        return;
      }

      try {
        await confirmDeleteAccount(token);
        logout();
        setState('success');
        setMessage('Your account has been deleted.');
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Unable to confirm deletion.');
      }
    }

    void run();
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <section className="w-full space-y-4 rounded-2xl border border-white/15 bg-slate-900/75 p-6">
        <h1 className="text-2xl font-semibold text-white">Account deletion</h1>
        <p className="text-slate-200">{message}</p>
        {state === 'processing' ? <div className="h-2 w-full animate-pulse rounded bg-slate-700" /> : null}
        {state !== 'processing' ? <Link className="button" href="/login">Back to login</Link> : null}
      </section>
    </main>
  );
}
