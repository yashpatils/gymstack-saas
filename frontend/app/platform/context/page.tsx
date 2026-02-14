"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/providers/AuthProvider";

export default function PlatformContextPage() {
  const router = useRouter();
  const { memberships, activeContext, switchMode } = useAuth();
  const [loading, setLoading] = useState<"OWNER" | "MANAGER" | null>(null);

  const ownerTenantIds = useMemo(() => memberships.filter((m) => m.role === "TENANT_OWNER").map((m) => m.tenantId), [memberships]);

  async function choose(mode: "OWNER" | "MANAGER") {
    const tenantId = activeContext?.tenantId ?? ownerTenantIds[0];
    if (!tenantId) {
      router.replace("/platform");
      return;
    }

    setLoading(mode);
    try {
      await switchMode(tenantId, mode);
      router.replace("/platform");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Choose Console Mode</h1>
        <p className="mt-2 text-sm text-slate-300">Owner mode is for tenant-level control. Manager mode is for location operations.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button className="rounded-2xl border border-white/20 bg-slate-900/70 p-5 text-left" onClick={() => void choose("OWNER")} disabled={loading !== null}>
            <p className="text-lg font-semibold text-white">Owner Console</p>
            <p className="mt-1 text-sm text-slate-300">Billing, domains, global tenant controls.</p>
          </button>
          <button className="rounded-2xl border border-sky-300/40 bg-sky-500/10 p-5 text-left" onClick={() => void choose("MANAGER")} disabled={loading !== null}>
            <p className="text-lg font-semibold text-white">Manager Console</p>
            <p className="mt-1 text-sm text-slate-300">Classes, members, staff operations.</p>
          </button>
        </div>
        {loading ? <p className="mt-4 text-sm text-slate-300">Switching mode...</p> : null}
      </div>
    </main>
  );
}
