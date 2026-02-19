'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { applyOAuthTokens, me } from '@/src/lib/auth';
import { getAuthErrorMessage } from '@/src/lib/authErrorMessage';
import type { MembershipRole } from '@/src/types/auth';
import { Alert, Button, Input } from './ui';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { shouldShowOAuth } from '@/src/lib/auth/shouldShowOAuth';

type GymLoginFormProps = {
  tenantId?: string;
  locationId?: string;
};

export function GymLoginForm({ tenantId, locationId }: GymLoginFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { chooseContext, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;
  const showOAuth = shouldShowOAuth({ pathname });
  const shouldSetLocationContext = useMemo(() => Boolean(tenantId && locationId), [locationId, tenantId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const token = params.get('token');
    const refreshToken = params.get('refreshToken') ?? params.get('refresh_token');

    if (oauth === 'success' && token) {
      applyOAuthTokens({ accessToken: token, refreshToken: refreshToken ?? undefined });

      void me()
        .then(async (currentUser) => {
          if (shouldSetLocationContext && tenantId && locationId) {
            await chooseContext(tenantId, locationId);
          }

          router.replace(resolveRoleDestination(currentUser.effectiveRole));
        })
        .catch(() => {
          setError('Unable to finish OAuth sign in. Please try again.');
        });
    }
  }, [chooseContext, locationId, router, shouldSetLocationContext, tenantId]);

  return (
    <form
      className="w-full max-w-md space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          const result = await login(email, password);
          const role = result.user.role as MembershipRole | null | undefined;

          if (shouldSetLocationContext && tenantId && locationId) {
            await chooseContext(tenantId, locationId);
          }

          router.push(resolveRoleDestination(role));
        } catch (submitError) {
          setError(getAuthErrorMessage(submitError));
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

function resolveRoleDestination(role: MembershipRole | string | null | undefined): string {
  if (role === 'CLIENT') {
    return '/platform/client';
  }

  if (role === 'GYM_STAFF_COACH' || role === 'TENANT_LOCATION_ADMIN') {
    return '/platform/coach';
  }

  return '/platform';
}
