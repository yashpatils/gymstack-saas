import Link from 'next/link';
import { adminApiFetch } from '../_lib/server-admin-api';
import type { AdminTenantListResponse } from '../../../src/types/admin';

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; pageSize?: string };
}) {
  const query = searchParams?.query?.trim() ?? '';
  const page = Number.parseInt(searchParams?.page ?? '1', 10);
  const pageSize = Number.parseInt(searchParams?.pageSize ?? '20', 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;

  const params = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
  });
  if (query) {
    params.set('query', query);
  }

  const data = await adminApiFetch<AdminTenantListResponse>(`/api/admin/tenants?${params.toString()}`);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Tenant Directory</h1>
        <p className="mt-2 text-sm text-slate-300">Search tenants and inspect ownership, management, and domain footprint.</p>
      </header>

      <form className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label htmlFor="query" className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Search by tenant name</label>
        <div className="flex gap-2">
          <input
            id="query"
            name="query"
            defaultValue={query}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-indigo-400/40 focus:ring"
            placeholder="Acme Fitness"
          />
          <button type="submit" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">Search</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Locations</th>
              <th className="px-4 py-3">Owners</th>
              <th className="px-4 py-3">Managers</th>
              <th className="px-4 py-3">Domains</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">White label</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((tenant) => (
              <tr key={tenant.tenantId} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-indigo-300 hover:text-indigo-200">{tenant.tenantName}</Link>
                </td>
                <td className="px-4 py-3">{tenant.locationsCount}</td>
                <td className="px-4 py-3">{tenant.ownersCount}</td>
                <td className="px-4 py-3">{tenant.managersCount}</td>
                <td className="px-4 py-3">{tenant.customDomainsCount}</td>
                <td className="px-4 py-3">{tenant.subscriptionStatus ?? 'N/A'}</td>
                <td className="px-4 py-3">{tenant.whiteLabelBranding ? "Enabled" : "Disabled"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
