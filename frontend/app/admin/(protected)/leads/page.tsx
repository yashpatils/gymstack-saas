import { adminApiFetch, getAdminSessionOrRedirect } from '../../_lib/server-admin-api';

type Lead = { id: string; name: string; email: string; gymName: string; size: string };

export default async function AdminLeadsPage() {
  await getAdminSessionOrRedirect();
  const leads = await adminApiFetch<Lead[]>('/api/admin/leads');
  return <section className="space-y-3"><h1 className="text-xl font-semibold">Leads</h1><ul className="space-y-2">{leads.map((lead) => <li key={lead.id} className="rounded border border-white/10 p-2">{lead.name} · {lead.email} · {lead.gymName} · {lead.size}</li>)}</ul></section>;
}
