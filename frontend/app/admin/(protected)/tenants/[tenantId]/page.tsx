import { adminApiFetch } from '../../../_lib/server-admin-api';
import type { AdminTenantDetail } from '../../../../../src/types/admin';
import { TenantActions } from '../tenant-actions';

export default async function AdminTenantDetailPage({ params }: { params: { tenantId: string } }) {
  const tenant = await adminApiFetch<AdminTenantDetail>(`/api/admin/tenants/${params.tenantId}`);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/30 to-cyan-500/10 p-6 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">{tenant.tenant.name}</h1>
        <p className="mt-2 text-sm text-slate-300">Tenant ID: {tenant.tenant.id}</p>
        <p className="mt-1 text-sm text-slate-300">Billing: {tenant.billing.subscriptionStatus} • ${(tenant.billing.mrrCents / 100).toFixed(2)} MRR</p>
        <div className="mt-4"><TenantActions tenantId={tenant.tenant.id} isDisabled={tenant.tenant.isDisabled} /></div>
      </header>

      <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">Key users</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {tenant.keyUsers.map((user) => (
            <li key={user.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">{user.email} • {user.role} • {user.subscriptionStatus}</li>
          ))}
        </ul>
      </article>

      <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">Locations</h2>
        <div className="space-y-3">
          {tenant.locations.map((location) => (
            <div key={location.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-medium text-white">{location.name} <span className="text-slate-400">({location.slug})</span></p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">Admin events</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {tenant.events.map((event) => (
            <li key={event.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">{event.type} • {new Date(event.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
