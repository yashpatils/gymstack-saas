import { adminApiFetch } from '../../_lib/server-admin-api';
import { firstString, toStringWithDefault } from '@/src/lib/safe';
import type { AppSearchParams } from '@/src/lib/pageProps';

type AdminAuditLog = {
  id: string;
  action: string;
  actorType: string;
  targetType?: string | null;
  targetId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  actorUser?: { email: string } | null;
};

export default async function AdminAuditPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const tenantId = toStringWithDefault(firstString(searchParams?.tenantId), '').trim();
  const action = toStringWithDefault(firstString(searchParams?.action), '').trim();
  const actor = toStringWithDefault(firstString(searchParams?.actor), '').trim();

  const params = new URLSearchParams();
  if (tenantId) params.set('tenantId', tenantId);
  if (action) params.set('action', action);
  if (actor) params.set('actor', actor);

  const logs = await adminApiFetch<AdminAuditLog[]>(`/api/admin/audit?${params.toString()}`);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Platform audit trail</h1>
        <p className="mt-2 text-sm text-slate-300">Filter across all tenants for enterprise support and compliance.</p>
      </header>
      <form className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="tenantId" defaultValue={tenantId} placeholder="Tenant ID" />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="action" defaultValue={action} placeholder="Action" />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="actor" defaultValue={actor} placeholder="Actor email" />
        <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">Filter</button>
      </form>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{log.actorUser?.email ?? log.actorType}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.targetType ?? '—'} {log.targetId ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
