'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';

type AuthGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function AuthGate({ children, fallback = null }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authIssue, isLoading, isAuthenticated, memberships, chooseContext, activeContext, logout } = useAuth();
  const hasAttemptedAutoSelect = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || pathname === '/login') {
      return;
    }

    router.replace('/login');
  }, [isAuthenticated, isLoading, pathname, router]);

  useEffect(() => {
    if (authIssue !== 'SESSION_EXPIRED') {
      return;
    }

    logout();
    router.replace('/login?message=Session+expired.+Please+sign+in+again.');
  }, [authIssue, logout, router]);

  useEffect(() => {
    if (isLoading || hasAttemptedAutoSelect.current || memberships.length !== 1 || activeContext) {
      return;
    }

    hasAttemptedAutoSelect.current = true;
    const onlyMembership = memberships[0];
    void chooseContext(onlyMembership.tenantId, onlyMembership.locationId ?? onlyMembership.gymId ?? undefined).catch(() => {
      hasAttemptedAutoSelect.current = false;
    });
  }, [activeContext, chooseContext, isLoading, memberships]);

  useEffect(() => {
    if (isLoading || memberships.length <= 1 || activeContext || pathname === '/select-workspace') {
      return;
    }

    router.replace('/select-workspace');
  }, [activeContext, isLoading, memberships.length, pathname, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (authIssue === 'INSUFFICIENT_PERMISSIONS') {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center p-6">
        <section className="w-full rounded-3xl border border-amber-300/35 bg-amber-500/10 p-8 text-amber-100">
          <h1 className="text-2xl font-semibold">Insufficient permissions for this area</h1>
          <p className="mt-3 text-sm text-amber-50">
            Your account is authenticated, but your current workspace does not allow access to this section.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="button" href="/select-workspace">Switch workspace</Link>
            <Link className="button secondary" href="/platform">Back to dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  if (memberships.length === 0) {
    return <NoMembershipState />;
  }

  return <>{children}</>;
}

function NoMembershipState() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState('');

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-3xl border border-white/15 bg-slate-900/70 p-8 text-slate-100">
        <h1 className="text-2xl font-semibold">You are not assigned to a gym yet</h1>
        <p className="mt-3 text-sm text-slate-300">Ask your admin for an invite token, or join from the invite page.</p>
        <div className="mt-5 space-y-3">
          <label className="block text-sm" htmlFor="inviteToken">Invite token</label>
          <input
            id="inviteToken"
            value={inviteToken}
            onChange={(event) => setInviteToken(event.target.value)}
            className="input w-full"
            placeholder="Paste your invite token"
          />
          <button
            type="button"
            className="button"
            onClick={() => router.push(`/signup?intent=staff&token=${encodeURIComponent(inviteToken.trim())}`)}
            disabled={inviteToken.trim().length === 0}
          >
            Continue with invite
          </button>
        </div>
        <Link className="mt-4 inline-block text-sky-300" href="/signup?intent=staff">Go to join page</Link>
      </section>
    </main>
  );
}
