import Link from 'next/link';
import { adminApiFetch } from './_lib/server-admin-api';
import type { AdminMetrics, AdminTenantListResponse } from '../../src/types/admin';

export default async function AdminDashboardPage() {
  const [metrics, tenants] = await Promise.all([
    adminApiFetch<AdminMetrics>('/api/admin/metrics'),
    adminApiFetch<AdminTenantListResponse>('/api/admin/tenants?page=1&pageSize=10'),
  ]);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/30 to-cyan-500/10 p-6 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Platform Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">Cross-tenant health and growth metrics for your company workspace.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Tenants', value: metrics.tenantsTotal },
          { label: 'Locations', value: metrics.locationsTotal },
          { label: 'Users', value: metrics.usersTotal },
          { label: 'Signups (7d)', value: metrics.signups7d },
          { label: 'Signups (30d)', value: metrics.signups30d },
          { label: 'Active memberships', value: metrics.activeMembershipsTotal },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value.toLocaleString()}</p>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Top recent tenants</h2>
          <Link href="/admin/tenants" className="text-sm text-indigo-300 hover:text-indigo-200">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-2">Tenant</th>
                <th className="py-2">Locations</th>
                <th className="py-2">Owners</th>
                <th className="py-2">Managers</th>
              </tr>
            </thead>
            <tbody>
              {tenants.items.map((tenant) => (
                <tr key={tenant.tenantId} className="border-b border-white/5 text-slate-200">
                  <td className="py-2">
                    <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300 hover:text-indigo-200">{tenant.tenantName}</Link>
                  </td>
                  <td className="py-2">{tenant.locationsCount}</td>
                  <td className="py-2">{tenant.ownersCount}</td>
                  <td className="py-2">{tenant.managersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
