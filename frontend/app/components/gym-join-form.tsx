'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { Alert, Button, Input } from './ui';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { shouldShowOAuth } from '@/src/lib/auth/shouldShowOAuth';

export function GymJoinForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { acceptInvite } = useAuth();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;
  const showOAuth = shouldShowOAuth({ pathname });

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const oauthToken = searchParams.get('token');
    const inviteToken = searchParams.get('inviteToken') ?? token;

    if (oauth === 'success' && oauthToken) {
      applyOAuthToken(oauthToken);
      if (inviteToken) {
        void acceptInvite({ token: inviteToken })
          .then(() => router.replace('/platform'))
          .catch((submitError) => {
            setError(submitError instanceof Error ? submitError.message : 'Unable to join');
          });
      } else {
        router.replace('/platform');
      }
    }
  }, [router, searchParams, token]);


  return (
    <form
      className="w-full max-w-md space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await acceptInvite({ token, email: email || undefined, password: password || undefined });
          router.push('/platform');
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Unable to join');
        }
      }}
    >
      <h1 className="text-2xl font-semibold text-white">Join your gym</h1>
      {error ? <Alert>{error}</Alert> : null}
      <Input label="Invite token" value={token} onChange={(event) => setToken(event.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="submit">Accept invite</Button>
      {showOAuth ? <OAuthButtons returnTo={returnTo} /> : null}
    </form>
  );
}
