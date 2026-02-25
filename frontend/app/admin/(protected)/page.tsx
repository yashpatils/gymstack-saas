import Link from "next/link";
import { adminApiFetch } from "../_lib/server-admin-api";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { StatCard } from "../../../src/components/platform/data";
import type { AdminAnalyticsGrowth, AdminAnalyticsHealth, AdminAnalyticsOverview, AdminAnalyticsUsage } from "../../../src/types/admin";
import { TenantActions } from "./tenants/tenant-actions";

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function SparkBars({ values, colorClass }: { values: number[]; colorClass: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-3 flex h-24 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className={`w-full rounded-t ${colorClass}`}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          title={String(value)}
        />
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [overview, growth, health, usage] = await Promise.all([
    adminApiFetch<AdminAnalyticsOverview>("/api/admin/analytics/overview"),
    adminApiFetch<AdminAnalyticsGrowth>("/api/admin/analytics/growth?range=30d"),
    adminApiFetch<AdminAnalyticsHealth>("/api/admin/analytics/health"),
    adminApiFetch<AdminAnalyticsUsage>("/api/admin/analytics/usage"),
  ]);

  const growthTenantSeries = growth.points.map((point) => point.tenants);
  const growthRevenueSeries = growth.points.map((point) => Math.round(point.mrrCents / 100));
  const topHealthRisk = [...health.tenants].sort((a, b) => a.healthScore - b.healthScore).slice(0, 8);

  return (
    <PageContainer>
      <PageHeader title="Platform Admin Intelligence" description="Cross-tenant analytics and operational health for GymStack." />

      <PageGrid columns={4}>
        <StatCard label="MRR" value={formatMoney(overview.mrrCents)} />
        <StatCard label="Active tenants" value={String(overview.activeTenants)} />
        <StatCard label="Trials" value={String(overview.trialTenants)} />
        <StatCard label="Churned (month)" value={String(overview.churnedThisMonth)} />
      </PageGrid>

      <PageGrid columns={2}>
        <PageCard title="Tenant growth (30d)">
          <p className="text-xs text-slate-400">New tenants this month: {overview.newTenantsThisMonth}</p>
          <SparkBars values={growthTenantSeries} colorClass="bg-cyan-500/70" />
        </PageCard>
        <PageCard title="Revenue growth (30d)">
          <p className="text-xs text-slate-400">ARR run-rate: {formatMoney(overview.arrCents)}</p>
          <SparkBars values={growthRevenueSeries} colorClass="bg-emerald-500/70" />
        </PageCard>
      </PageGrid>

      <PageGrid columns={2}>
        <PageCard title="Plan distribution">
          <ul className="space-y-2 text-sm">
            {overview.planDistribution.map((plan) => (
              <li key={plan.planKey} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <span className="uppercase tracking-wide text-slate-300">{plan.planKey}</span>
                <span className="font-medium text-white">{plan.count}</span>
              </li>
            ))}
          </ul>
        </PageCard>

        <PageCard title="Usage (last 30d)">
          <ul className="space-y-2 text-sm">
            {usage.tenants
              .sort((a, b) => b.apiCalls - a.apiCalls)
              .slice(0, 6)
              .map((tenant) => (
                <li key={tenant.tenantId} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <span className="text-slate-200">{tenant.tenantName}</span>
                  <span className="text-slate-300">API: {tenant.apiCalls} · Webhook failures: {tenant.webhookFailures}</span>
                </li>
              ))}
          </ul>
        </PageCard>
      </PageGrid>

      <PageCard title="Tenant health">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {topHealthRisk.map((tenant) => (
                <tr key={tenant.tenantId} className="border-t border-white/10 text-slate-200">
                  <td className="px-4 py-3">{tenant.tenantName}</td>
                  <td className="px-4 py-3 uppercase">{tenant.planKey}</td>
                  <td className="px-4 py-3">{tenant.status}</td>
                  <td className="px-4 py-3">{tenant.healthScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TenantActions tenantId={tenant.tenantId} isDisabled={false} />
                      <Link className="rounded-lg border border-white/20 px-2 py-1 text-xs" href={`/admin/orgs/${tenant.tenantId}`} target="_blank">View tenant</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </PageContainer>
  );
}
