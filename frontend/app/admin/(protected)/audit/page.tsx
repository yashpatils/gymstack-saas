import { adminApiFetch } from '../../_lib/server-admin-api';
import { firstString, toStringWithDefault } from '@/src/lib/safe';
import type { AppSearchParams } from '@/src/lib/pageProps';

type AdminAuditLog = {
  id: string;
  action: string;
  actorType: string;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  actorUser?: { email: string } | null;
};

type AdminAuditPageResult = { items: AdminAuditLog[]; nextCursor: string | null };

export default async function AdminAuditPage({ searchParams }: { searchParams?: AppSearchParams }) {
  const tenantId = toStringWithDefault(firstString(searchParams?.tenantId), '').trim();
  const action = toStringWithDefault(firstString(searchParams?.action), '').trim();
  const actor = toStringWithDefault(firstString(searchParams?.actor), '').trim();
  const from = toStringWithDefault(firstString(searchParams?.from), '').trim();
  const to = toStringWithDefault(firstString(searchParams?.to), '').trim();

  const params = new URLSearchParams();
  if (tenantId) params.set('tenantId', tenantId);
  if (action) params.set('action', action);
  if (actor) params.set('actor', actor);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('limit', '100');

  const payload = await adminApiFetch<AdminAuditPageResult>(`/api/admin/audit?${params.toString()}`);
  const logs = payload.items;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Platform audit trail</h1>
      </header>
      <form className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-6">
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="tenantId" defaultValue={tenantId} placeholder="Tenant ID" />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="action" defaultValue={action} placeholder="Action" />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" name="actor" defaultValue={actor} placeholder="Actor email" />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" type="date" name="from" defaultValue={from} />
        <input className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" type="date" name="to" defaultValue={to} />
        <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">Filter</button>
      </form>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">IP</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{log.actorEmail ?? log.actorUser?.email ?? log.actorType}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.targetType ?? '—'} {log.targetId ?? ''}</td>
                <td className="px-4 py-3">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
