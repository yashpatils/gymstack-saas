'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminLogin, logout, me } from '../../../src/lib/auth';
import { ApiFetchError } from '../../../src/lib/apiFetch';
import { Alert, Button, Input } from '../../components/ui';

const ADMIN_ONLY_ERROR = 'Access restricted: admins only';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceFreshLogin = searchParams.get('fresh') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      if (forceFreshLogin) {
        logout();
        if (isMounted) {
          setError(null);
          setCheckingSession(false);
        }
        return;
      }

      try {
        const session = await me();
        if (!isMounted) {
          return;
        }

        if (session.platformRole === 'PLATFORM_ADMIN') {
          router.replace('/admin');
          return;
        }

        setError('Access restricted: Gym Stack admins only');
      } catch (sessionError) {
        if (!isMounted) {
          return;
        }

        if (sessionError instanceof ApiFetchError && sessionError.statusCode === 401) {
          setError(null);
        } else {
          setError(sessionError instanceof Error ? sessionError.message : 'Unable to verify your session.');
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [forceFreshLogin, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-slate-900/75 p-6 shadow-2xl backdrop-blur"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          setError(null);

          try {
            await adminLogin(email, password);
            const session = await me();

            if (session.platformRole !== 'PLATFORM_ADMIN') {
              logout();
              setError(ADMIN_ONLY_ERROR);
              return;
            }

            router.replace('/admin');
          } catch (submitError) {
            if (submitError instanceof ApiFetchError && submitError.statusCode === 403) {
              setError(ADMIN_ONLY_ERROR);
            } else {
              setError(submitError instanceof Error ? submitError.message : 'Unable to login.');
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold text-white">Gym Stack Admin</h1>
        <p className="text-sm text-slate-300">Sign in to the platform admin dashboard.</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={submitting || checkingSession}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
        <p className="text-sm text-slate-300">Need member login? <a href="https://gymstack.club/login" className="text-sky-300">Go to gymstack.club/login</a></p>
      </form>
    </main>
  );
}
