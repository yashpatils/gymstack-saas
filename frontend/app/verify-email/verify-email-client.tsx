'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resendVerification, verifyEmail } from '../../src/lib/auth';

type VerifyState = 'verifying' | 'success' | 'error';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const nextPath = searchParams.get('next') || '/platform';
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    async function run() {
      if (!token) {
        setState('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        await verifyEmail(token);
        setState('success');
        setMessage('Your email is verified. You can now continue to your workspace.');
        router.replace(nextPath);
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed. Token may be expired.');
      }
    }

    void run();
  }, [nextPath, router, token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <section className="w-full space-y-4 rounded-2xl border border-white/15 bg-slate-900/75 p-6">
        <h1 className="text-2xl font-semibold text-white">Email verification</h1>
        <p className="text-slate-200">{message}</p>
        {state === 'verifying' ? <div className="h-2 w-full animate-pulse rounded bg-slate-700" /> : null}
        {state === 'success' ? <Link className="button" href={nextPath}>Continue</Link> : null}
        {state === 'error' ? (
          <button
            type="button"
            className="button"
            onClick={async () => {
              const email = window.prompt('Enter your account email to resend verification');
              if (!email) {
                return;
              }
              const result = await resendVerification(email);
              setMessage(result.message);
            }}
          >
            Resend verification
          </button>
        ) : null}
      </section>
    </main>
  );
}
