'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/providers/AuthProvider';
import { applyOAuthToken, me } from '@/src/lib/auth';
import { Alert, Button, Input } from './ui';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { shouldShowOAuth } from '@/src/lib/auth/shouldShowOAuth';
import { apiFetch } from '@/src/lib/apiFetch';
import type { MembershipRole } from '@/src/types/auth';

type InviteValidationResponse =
  | { ok: true; role: MembershipRole; locationId: string; tenantId: string; locationName?: string; expiresAt: string; targeted: boolean }
  | { ok: false; reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED' };

export function GymJoinForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { acceptInvite } = useAuth();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [inviteValidation, setInviteValidation] = useState<InviteValidationResponse | null>(null);
  const returnTo = typeof window === 'undefined' ? pathname : window.location.href;
  const showOAuth = shouldShowOAuth({ pathname });

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const oauthToken = searchParams.get('token');
    const oauthError = searchParams.get('error');

    if (oauth === 'success' && oauthToken) {
      applyOAuthToken(oauthToken);
      void me().then((currentUser) => {
        if (currentUser.effectiveRole === 'GYM_STAFF_COACH' || currentUser.effectiveRole === 'TENANT_LOCATION_ADMIN') {
          router.replace('/platform/coach');
          return;
        }
        if (currentUser.effectiveRole === 'CLIENT') {
          router.replace('/platform/client');
          return;
        }
        router.replace('/platform');
      });
    }

    if (oauthError) {
      setError(mapOAuthError(oauthError));
    }
  }, [router, searchParams]);

  useEffect(() => {
    const currentToken = searchParams.get('token') ?? token;
    if (!currentToken) {
      setInviteValidation(null);
      return;
    }

    setValidating(true);
    setError(null);
    void apiFetch<InviteValidationResponse>('/api/invites/validate', {
      method: 'POST',
      body: JSON.stringify({ token: currentToken }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => {
        setInviteValidation(response);
        if (!response.ok) {
          setError(mapInviteReason(response.reason));
        }
      })
      .catch(() => {
        setInviteValidation({ ok: false, reason: 'INVALID' });
        setError('Invite token is invalid.');
      })
      .finally(() => setValidating(false));
  }, [searchParams, token]);


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
      {validating ? <p className="text-xs text-slate-300">Validating invite…</p> : null}
      {inviteValidation?.ok ? <p className="text-xs text-emerald-300">{inviteValidation.role === 'CLIENT' ? 'Join as Member' : 'Join as Staff/Coach'} at {inviteValidation.locationName ?? 'this location'}.</p> : null}
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="submit">Accept invite</Button>
      {showOAuth ? <OAuthButtons returnTo={returnTo} inviteToken={token || undefined} /> : null}
    </form>
  );
}

function mapInviteReason(reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED'): string {
  if (reason === 'EXPIRED') return 'Invite expired. Please ask your manager for a new invite.';
  if (reason === 'ALREADY_USED') return 'Invite already used. Please ask your manager for a new invite.';
  if (reason === 'REVOKED') return 'Invite has been revoked. Ask your manager for a new invite.';
  return 'Invite token is invalid.';
}

function mapOAuthError(error: string): string {
  if (error === 'invite_required') return 'Invite required. Start from a valid join invite link.';
  if (error === 'invite_expired') return 'Invite expired. Please ask for a new invite.';
  if (error === 'invite_already_used') return 'Invite already used. Please request another invite.';
  if (error === 'invite_revoked') return 'Invite has been revoked.';
  if (error === 'invite_invalid') return 'Invite token is invalid.';
  if (error === 'invite_role_mismatch') return 'Invite does not match this authenticated account.';
  return 'Unable to continue with OAuth.';
}
