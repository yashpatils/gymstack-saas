import Link from "next/link";
import { adminApiFetch } from "../_lib/server-admin-api";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { SectionCard } from "../../../src/components/common/SectionCard";
import { StatCard } from "../../../src/components/common/StatCard";
import type { AdminOverview, AdminTenantListResponse } from "../../../src/types/admin";

export default async function AdminDashboardPage() {
  const [overview, tenants] = await Promise.all([
    adminApiFetch<AdminOverview>("/api/admin/overview"),
    adminApiFetch<AdminTenantListResponse>("/api/admin/tenants?page=1"),
  ]);

  const topTenants = [...tenants.items].sort((a, b) => b.mrrCents - a.mrrCents).slice(0, 5);

  return (
    <section className="space-y-6">
      <PageHeader title="Platform Owner Dashboard" subtitle="Cross-tenant health, billing performance, and growth signals." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="MRR" value={`$${(overview.totals.mrrCents / 100).toFixed(2)}`} />
        <StatCard label="Active subscriptions" value={String(overview.totals.activeSubscriptions)} />
        <StatCard label="Trials" value={String(overview.totals.trials)} />
        <StatCard label="Past due" value={String(overview.totals.pastDue)} />
        <StatCard label="Canceled" value={String(overview.totals.canceled)} />
        <StatCard label="New tenants (7d / 30d)" value={`${overview.trends.newTenants7d} / ${overview.trends.newTenants30d}`} />
      </div>

      <SectionCard title="Top tenants by revenue" actions={<Link href="/admin/tenants" className="text-sm text-indigo-300 hover:text-indigo-200">View all</Link>}>
        <ul className="space-y-2 text-sm text-slate-200">
          {topTenants.map((tenant) => (
            <li key={tenant.tenantId} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
              <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300">{tenant.tenantName}</Link>
              <span>${(tenant.mrrCents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </section>
  );
}
