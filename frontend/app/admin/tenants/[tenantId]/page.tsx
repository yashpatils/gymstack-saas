"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../src/lib/apiFetch";
import type { AdminTenantDetail } from "../../../../src/types/admin";

export default function AdminTenantDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    void apiFetch<AdminTenantDetail>(`/api/admin/tenants/${tenantId}`, { cache: "no-store" })
      .then((response) => setTenant(response))
      .catch(() => setTenant(null));
  }, [tenantId]);

  if (!tenant) {
    return <p className="text-sm text-slate-400">Loading tenant details...</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-indigo-100">{tenant.name}</h1>
        <p className="text-sm text-slate-400">Tenant ID: {tenant.id}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Total Memberships</p>
          <p className="mt-2 text-2xl text-white">{tenant.membershipCounts.total}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Active</p>
          <p className="mt-2 text-2xl text-emerald-300">{tenant.membershipCounts.active}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Invited</p>
          <p className="mt-2 text-2xl text-amber-300">{tenant.membershipCounts.invited}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Disabled</p>
          <p className="mt-2 text-2xl text-rose-300">{tenant.membershipCounts.disabled}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Locations</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          {tenant.locations.map((location) => (
            <li key={location.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              {location.name} <span className="text-slate-500">({location.slug})</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
