import Link from 'next/link';
import { adminApiFetch } from '../_lib/server-admin-api';
import type { AdminOverview, AdminTenantListResponse } from '../../../src/types/admin';

export default async function AdminDashboardPage() {
  const [overview, tenants] = await Promise.all([
    adminApiFetch<AdminOverview>('/api/admin/overview'),
    adminApiFetch<AdminTenantListResponse>('/api/admin/tenants?page=1'),
  ]);

  const topTenants = [...tenants.items].sort((a, b) => b.mrrCents - a.mrrCents).slice(0, 5);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/30 to-cyan-500/10 p-6 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Platform Owner Dashboard</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'MRR', value: `$${(overview.totals.mrrCents / 100).toFixed(2)}` },
          { label: 'Active subscriptions', value: overview.totals.activeSubscriptions },
          { label: 'Trials', value: overview.totals.trials },
          { label: 'Past due', value: overview.totals.pastDue },
          { label: 'Canceled', value: overview.totals.canceled },
          { label: 'New tenants (7d / 30d)', value: `${overview.trends.newTenants7d} / ${overview.trends.newTenants30d}` },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Top tenants by revenue</h2>
          <Link href="/admin/tenants" className="text-sm text-indigo-300 hover:text-indigo-200">View all</Link>
        </div>
        <ul className="space-y-2 text-sm text-slate-200">
          {topTenants.map((tenant) => (
            <li key={tenant.tenantId} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
              <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300">{tenant.tenantName}</Link>
              <span>${(tenant.mrrCents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
