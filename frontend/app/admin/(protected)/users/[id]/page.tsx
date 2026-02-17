import Link from 'next/link';
import { adminApiFetch } from '../../../_lib/server-admin-api';

type MembershipSummary = {
  id: string;
  orgId: string;
  gymId?: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type AdminUserDetail = {
  id: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  activeSessions: number;
  memberships: MembershipSummary[];
};

async function revokeUserSessions(userId: string): Promise<void> {
  'use server';
  await adminApiFetch(`/api/admin/users/${userId}/revoke-sessions`, { method: 'POST' });
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = await adminApiFetch<AdminUserDetail>(`/api/admin/users/${params.id}`);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link href="/admin/users" className="text-sm text-indigo-300 hover:text-indigo-200">← Back to users</Link>
        <h1 className="text-3xl font-semibold text-white">{user.email}</h1>
        <p className="text-sm text-slate-300">Role: {user.role} • Status: {user.status} • Active sessions: {user.activeSessions}</p>
      </header>

      <form action={revokeUserSessions.bind(null, user.id)}>
        <button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400" type="submit">Revoke sessions</button>
      </form>

      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold text-white">Memberships</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {user.memberships.map((membership) => (
            <li key={membership.id} className="rounded-lg border border-white/10 p-3">Tenant {membership.orgId} • Location {membership.gymId ?? '—'} • {membership.role} ({membership.status})</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
