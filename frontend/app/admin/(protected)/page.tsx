import Link from "next/link";
import { adminApiFetch } from "../_lib/server-admin-api";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { StatCard } from "../../../src/components/platform/data";
import type { AdminOverview, AdminTenantListResponse } from "../../../src/types/admin";

export default async function AdminDashboardPage() {
  const [overview, tenants] = await Promise.all([
    adminApiFetch<AdminOverview>("/api/admin/overview"),
    adminApiFetch<AdminTenantListResponse>("/api/admin/tenants?page=1"),
  ]);

  const topTenants = [...tenants.items].sort((a, b) => b.mrrCents - a.mrrCents).slice(0, 5);

  return (
    <PageContainer>
      <PageHeader title="Platform Owner Dashboard" description="Operational view across all tenants." />
      <PageGrid columns={3}>
        <StatCard label="MRR" value={`$${(overview.totals.mrrCents / 100).toFixed(2)}`} />
        <StatCard label="Active subscriptions" value={String(overview.totals.activeSubscriptions)} />
        <StatCard label="Trials" value={String(overview.totals.trials)} />
      </PageGrid>
      <PageCard title="Top tenants by revenue">
        <ul className="space-y-[var(--space-xs)] text-sm">
          {topTenants.map((tenant) => (
            <li key={tenant.tenantId} className="flex items-center justify-between rounded-[var(--radius-md)] border border-white/10 px-[var(--space-md)] py-[var(--space-sm)]">
              <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300">{tenant.tenantName}</Link>
              <span>${(tenant.mrrCents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </PageCard>
    </PageContainer>
  );
}
