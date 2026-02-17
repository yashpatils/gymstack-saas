import Link from "next/link";
import { adminApiFetch } from "../../_lib/server-admin-api";
import { PageHeader } from "../../../../src/components/common/PageHeader";
import { SectionCard } from "../../../../src/components/common/SectionCard";
import { firstString, toStringWithDefault } from "@/src/lib/safe";
import type { AppSearchParams } from "@/src/lib/pageProps";
import { TenantActions } from "./tenant-actions";
import type { AdminTenantListResponse } from "../../../../src/types/admin";

export default async function AdminTenantsPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const query = toStringWithDefault(firstString(searchParams?.query), "").trim();
  const status = toStringWithDefault(firstString(searchParams?.status), "").trim();
  const page = Number.parseInt(toStringWithDefault(firstString(searchParams?.page), "1"), 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const params = new URLSearchParams({ page: String(safePage) });
  if (query) params.set("query", query);
  if (status) params.set("status", status);

  const data = await adminApiFetch<AdminTenantListResponse>(`/api/admin/tenants?${params.toString()}`);

  return (
    <section className="space-y-6">
      <PageHeader title="Tenants" subtitle="Search, filter, and manage tenant billing state across the platform." />

      <SectionCard title="Filters">
        <form className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
          <input name="query" defaultValue={query} className="input px-3 py-2 text-sm text-white" placeholder="Search tenant" />
          <select name="status" defaultValue={status} className="input px-3 py-2 text-sm text-white">
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <button type="submit" className="button">Apply</button>
        </form>
      </SectionCard>

      <SectionCard title="Tenant list">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">Locations</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((tenant) => (
                <tr key={tenant.tenantId} className="border-t border-white/5 text-slate-200">
                  <td className="px-4 py-3"><Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300 hover:text-indigo-200">{tenant.tenantName}</Link></td>
                  <td className="px-4 py-3">{tenant.subscriptionStatus}{tenant.isDisabled ? " • DISABLED" : ""}</td>
                  <td className="px-4 py-3">${(tenant.mrrCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">{tenant.locationsCount}</td>
                  <td className="px-4 py-3">{tenant.usersCount}</td>
                  <td className="px-4 py-3"><TenantActions tenantId={tenant.tenantId} isDisabled={tenant.isDisabled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  );
}
