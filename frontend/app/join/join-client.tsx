'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Input } from '@/app/components/ui';
import { OAuthButtons } from '@/src/components/auth/OAuthButtons';
import { apiFetch } from '@/src/lib/apiFetch';
import { applyOAuthTokens, me } from '@/src/lib/auth';
import { useAuth } from '@/src/providers/AuthProvider';
import type { MembershipRole } from '@/src/types/auth';

type InviteValidationResponse =
  | {
    ok: true;
    valid: true;
    role: MembershipRole;
    tenantId: string;
    locationId: string;
    locationName?: string;
    locationSlug?: string;
    emailBound?: boolean;
    expiresAt: string;
  }
  | {
    ok: false;
    valid: false;
    reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED';
    errorCode: 'invite_invalid' | 'invite_expired' | 'invite_already_used' | 'invite_revoked';
  };

export function JoinClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signup, chooseContext } = useAuth();

  const token = searchParams.get('token') ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invite, setInvite] = useState<InviteValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return pathname;
    }

    return window.location.href;
  }, [pathname]);

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const oauthToken = searchParams.get('token');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(mapOAuthError(oauthError));
      return;
    }

    if (oauth === 'success' && oauthToken) {
      applyOAuthTokens({ accessToken: oauthToken });
      void me().then(async (currentUser) => {
        if (invite && invite.ok) {
          await chooseContext(invite.tenantId, invite.locationId);
          router.replace(resolveRoleDestination(invite.role));
          return;
        }

        router.replace(resolveRoleDestination(currentUser.effectiveRole));
      }).catch(() => {
        setError('Unable to finish OAuth sign in. Please try again.');
      });
    }
  }, [chooseContext, invite, router, searchParams]);

  useEffect(() => {
    if (!token) {
      setInvite({ ok: false, valid: false, reason: 'INVALID', errorCode: 'invite_invalid' });
      setValidating(false);
      setError('Invite required. Please use a valid invite link.');
      return;
    }

    setValidating(true);
    setError(null);

    void apiFetch<InviteValidationResponse>(`/api/invites/validate?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setInvite(response);
        if (!response.ok) {
          setError(mapInviteReason(response.reason));
        }
      })
      .catch(() => {
        setInvite({ ok: false, valid: false, reason: 'INVALID', errorCode: 'invite_invalid' });
        setError('Invite token is invalid.');
      })
      .finally(() => setValidating(false));
  }, [token]);

  return (
    <section className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950/90 p-8 shadow-2xl">
      <h1 className="text-3xl font-semibold text-white">
        Join {invite?.ok ? invite.locationName ?? 'GymStack' : 'GymStack'}
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        {invite?.ok ? `Invitation role: ${invite.role === 'CLIENT' ? 'Client' : 'Staff / Coach'}` : 'Validate your invite to continue.'}
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!token) {
            setError('Invite required. Please use a valid invite link.');
            return;
          }

          setSubmitting(true);
          setError(null);
          try {
            const result = await signup(email, password, undefined, token);
            const destinationRole = invite?.ok ? invite.role : result.user.role;

            if (invite?.ok) {
              await chooseContext(invite.tenantId, invite.locationId);
            }

            router.replace(resolveRoleDestination(destinationRole));
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to join.');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {validating ? <p className="text-xs text-slate-300">Validating invite…</p> : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!invite?.ok || submitting} />
        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!invite?.ok || submitting} />
        <Button type="submit" disabled={!invite?.ok || submitting}>
          {submitting ? 'Joining...' : 'Join gym'}
        </Button>
        <OAuthButtons returnTo={returnTo} inviteToken={token || undefined} />
      </form>
    </section>
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
  if (error === 'invite_role_mismatch') return 'Invite email does not match the authenticated account.';
  return 'Unable to continue with OAuth.';
}

function resolveRoleDestination(role: string | null | undefined): string {
  if (role === 'CLIENT') {
    return '/platform/client';
  }

  if (role === 'GYM_STAFF_COACH' || role === 'TENANT_LOCATION_ADMIN') {
    return '/platform/coach';
  }

  return '/platform';
}
