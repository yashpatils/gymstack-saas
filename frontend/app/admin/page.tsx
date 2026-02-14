"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../src/lib/api";
import type { AdminMetrics } from "../../src/types/admin";

const emptyMetrics: AdminMetrics = {
  mrr: 0,
  arr: 0,
  activeTenants: 0,
  activeLocations: 0,
  activeSubscriptions: 0,
  trialingCount: 0,
  pastDueCount: 0,
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics);

  useEffect(() => {
    void apiFetch<AdminMetrics>("/api/admin/metrics", { cache: "no-store" })
      .then((response) => setMetrics(response))
      .catch(() => setMetrics(emptyMetrics));
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="bg-gradient-to-r from-indigo-200 to-cyan-300 bg-clip-text text-3xl font-semibold text-transparent">Platform Control Center</h1>
        <p className="text-sm text-slate-400">Cross-tenant metrics are available only to PLATFORM_ADMIN users.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "MRR", value: `$${metrics.mrr}` },
          { label: "ARR", value: `$${metrics.arr}` },
          { label: "Active Tenants", value: metrics.activeTenants },
          { label: "Active Locations", value: metrics.activeLocations },
          { label: "Active Subscriptions", value: metrics.activeSubscriptions },
          { label: "Trialing", value: metrics.trialingCount },
          { label: "Past Due", value: metrics.pastDueCount },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-xl shadow-indigo-950/20">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-indigo-100">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
