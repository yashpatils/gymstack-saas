'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { applyOAuthTokens } from '@/src/lib/auth';
import { Alert, Button, Input } from './ui';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { shouldShowOAuth } from '@/src/lib/auth/shouldShowOAuth';

export function GymLoginForm() {
  const router = useRouter();
  const pathname = usePathname();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;
  const showOAuth = shouldShowOAuth({ pathname });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const token = params.get('token');
    const refreshToken = params.get('refreshToken') ?? params.get('refresh_token');
    if (oauth === 'success' && token) {
      applyOAuthTokens({ accessToken: token, refreshToken: refreshToken ?? undefined });
      router.replace('/platform');
    }
  }, [router]);


  return (
    <form
      className="w-full max-w-md space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await login(email, password);
          router.push('/platform');
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Unable to login');
        }
      }}
    >
      <h1 className="text-2xl font-semibold text-white">Gym login</h1>
      {error ? <Alert>{error}</Alert> : null}
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Button type="submit">Sign in</Button>

      {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}

    </form>
  );
}
