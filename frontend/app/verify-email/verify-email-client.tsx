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
  const nextPath = searchParams.get('next');
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [email, setEmail] = useState<string>('');

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
        setMessage('Your email is verified. Redirecting you now...');
        const destination = nextPath || '/platform';
        window.setTimeout(() => {
          router.replace(destination);
        }, 600);
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
        {state === 'success' ? <Link className="button" href={nextPath || '/platform'}>Continue</Link> : null}
        {state === 'error' ? (
          <div className="space-y-3">
            <input
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              type="email"
              value={email}
              placeholder="Enter your account email"
              onChange={(event) => setEmail(event.target.value)}
            />
            <button
              type="button"
              className="button"
              onClick={async () => {
                const result = await resendVerification(email);
                setMessage(result.emailDeliveryWarning ?? result.message);
              }}
            >
              Resend verification
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
