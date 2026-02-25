import type { AdminOrgDetail } from '../../../../../src/types/admin';
import { adminApiFetch } from '../../../_lib/server-admin-api';

export default async function AdminOrgDetailPage({ params }: { params: { orgId: string } }) {
  const data = await adminApiFetch<AdminOrgDetail>(`/api/admin/orgs/${params.orgId}`);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/30 to-cyan-500/10 p-6 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">{data.org.name}</h1>
        <p className="mt-2 text-sm text-slate-300">Org ID: {data.org.id}</p>
        <p className="mt-1 text-sm text-slate-300">Subscription: {data.subscription.subscriptionStatus} • ${(data.subscription.mrrCents / 100).toFixed(2)} MRR</p>
      </header>

      <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">Gyms</h2>
        <div className="space-y-3">
          {data.gyms.map((gym) => (
            <div key={gym.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-medium text-white">{gym.name} <span className="text-slate-400">({gym.slug})</span></p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">Key users</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {data.keyUsers.map((user) => (
            <li key={user.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">{user.email} • {user.role} • {user.subscriptionStatus}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
