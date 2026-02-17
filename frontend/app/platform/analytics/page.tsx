"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

type TenantHealth = {
  tenantId: string;
  score: number;
  warnings: Array<{ type: string; severity: "info" | "warning" | "critical"; title: string; createdAt: string }>;
  metrics: { checkinsDeltaPercent: number; bookingsDeltaPercent: number; cancellationsDeltaPercent: number };
};

export default function PlatformAnalyticsPage() {
  const [health, setHealth] = useState<TenantHealth | null>(null);

  useEffect(() => {
    apiFetch<TenantHealth>("/api/tenant/health", { method: "GET", cache: "no-store" }).then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <section className="page space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold">Health</h2>
        <p className="text-sm text-slate-300">Score: {health?.score ?? "—"}</p>
        <ul className="mt-2 space-y-2">
          {health?.warnings.map((warning) => (
            <li key={`${warning.type}-${warning.createdAt}`} className="text-sm text-slate-200">{warning.title}</li>
          ))}
        </ul>
        <Link className="mt-3 inline-flex text-sm text-indigo-300" href="/platform/notifications">Open notifications</Link>
      </div>
    </section>
  );
}
