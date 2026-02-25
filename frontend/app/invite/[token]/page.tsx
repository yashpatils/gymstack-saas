"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { apiFetch, ApiFetchError } from '@/src/lib/apiFetch';
import { useAuth } from '@/src/providers/AuthProvider';

type InviteMetadata = {
  inviteId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  role: 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT';
  tenantId: string;
  gymId: string | null;
  email: string | null;
  expiresAt: string;
};

export default function InviteTokenPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const router = useRouter();
  const { authStatus, user, chooseContext } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void apiFetch<InviteMetadata>(`/api/invites/${encodeURIComponent(token)}`)
      .then((result) => {
        if (!mounted) return;
        setInvite(result);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof ApiFetchError ? err.message : 'Unable to load invite.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const nextPath = useMemo(() => `/invite/${encodeURIComponent(token)}`, [token]);

  const accept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ ok: true; tenantId: string; gymId: string | null }>(`/api/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      await chooseContext(result.tenantId, result.gymId ?? undefined);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiFetchError ? err.message : 'Unable to accept invite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-white">Location invite</h1>
      {loading ? <p className="text-sm text-slate-300">Loading invite…</p> : null}
      {invite ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-200">
          <p><span className="text-slate-400">Role:</span> {invite.role}</p>
          <p><span className="text-slate-400">Email:</span> {invite.email ?? 'Any authenticated user'}</p>
          <p><span className="text-slate-400">Expires:</span> {new Date(invite.expiresAt).toLocaleString()}</p>
          <p><span className="text-slate-400">Status:</span> {invite.status}</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {authStatus !== 'authenticated' || !user ? (
        <Link className="button" href={`/login?next=${encodeURIComponent(nextPath)}`}>
          Log in to accept invite
        </Link>
      ) : (
        <Button onClick={() => void accept()} disabled={!invite || submitting || invite.status !== 'PENDING'}>
          {submitting ? 'Accepting…' : 'Accept invite'}
        </Button>
      )}
    </main>
  );
}
