import Link from 'next/link';
import { adminApiFetch } from '../../_lib/server-admin-api';
import { firstString, toStringWithDefault } from '@/src/lib/safe';
import type { AppSearchParams } from '@/src/lib/pageProps';

type AdminUserListItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  orgId?: string | null;
};

export default async function AdminUsersPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const query = toStringWithDefault(firstString(searchParams?.query), '').trim();
  const params = new URLSearchParams();
  if (query) {
    params.set('query', query);
  }

  const users = await adminApiFetch<AdminUserListItem[]>(`/api/admin/users?${params.toString()}`);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">User support tooling</h1>
        <p className="mt-2 text-sm text-slate-300">Search users and open support actions.</p>
      </header>
      <form className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="query">Search by email or id</label>
        <div className="flex gap-2">
          <input id="query" name="query" defaultValue={query} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" />
          <button type="submit" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">Search</button>
        </div>
      </form>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tenant</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3"><Link href={`/admin/users/${user.id}`} className="text-indigo-300 hover:text-indigo-200">{user.email}</Link></td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3">{user.orgId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
