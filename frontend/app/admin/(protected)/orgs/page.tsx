import Link from 'next/link';
import { adminApiFetch } from '../../_lib/server-admin-api';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { SectionCard } from '../../../../src/components/common/SectionCard';
import { firstString, toStringWithDefault } from '@/src/lib/safe';
import type { AppSearchParams } from '@/src/lib/pageProps';
import type { AdminOrgListResponse } from '../../../../src/types/admin';

export default async function AdminOrgsPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const search = toStringWithDefault(firstString(searchParams?.search), '').trim();
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const data = await adminApiFetch<AdminOrgListResponse>(`/api/admin/orgs?${params.toString()}`);

  return (
    <section className="space-y-6">
      <PageHeader title="Organizations" subtitle="Search and inspect organizations across the platform." />

      <SectionCard title="Search">
        <form className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input name="search" defaultValue={search} className="input px-3 py-2 text-sm text-white" placeholder="Search organization" />
          <button type="submit" className="button">Apply</button>
        </form>
      </SectionCard>

      <SectionCard title="Organization list">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">Gyms</th>
                <th className="px-4 py-3">Users</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((org) => (
                <tr key={org.id} className="border-t border-white/5 text-slate-200">
                  <td className="px-4 py-3"><Link href={`/admin/orgs/${org.id}`} className="text-indigo-300 hover:text-indigo-200">{org.name}</Link></td>
                  <td className="px-4 py-3">{org.subscriptionStatus}{org.isDisabled ? ' • DISABLED' : ''}</td>
                  <td className="px-4 py-3">${(org.mrrCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">{org.gymsCount}</td>
                  <td className="px-4 py-3">{org.usersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  );
}
