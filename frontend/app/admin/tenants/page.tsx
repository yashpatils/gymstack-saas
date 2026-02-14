"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../src/lib/apiFetch";
import type { AdminTenantListResponse } from "../../../src/types/admin";

const emptyResponse: AdminTenantListResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

export default function AdminTenantsPage() {
  const [data, setData] = useState<AdminTenantListResponse>(emptyResponse);

  useEffect(() => {
    void apiFetch<AdminTenantListResponse>("/api/admin/tenants?page=1&pageSize=50", { cache: "no-store" })
      .then((response) => setData(response))
      .catch(() => setData(emptyResponse));
  }, []);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-indigo-100">Tenant Directory</h1>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Locations</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((tenant) => (
              <tr key={tenant.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${tenant.id}`} className="text-indigo-300 hover:text-indigo-200">
                    {tenant.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{tenant.subscriptionStatus}</td>
                <td className="px-4 py-3">{tenant.plan}</td>
                <td className="px-4 py-3">{tenant.locationCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
