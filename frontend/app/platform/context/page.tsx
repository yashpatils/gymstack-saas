"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/providers/AuthProvider";
import { PageCard, PageContainer, PageHeader, PageSection } from "@/src/components/platform/page/primitives";

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
    <PageContainer>
      <PageHeader title="Choose console mode" description="Switch between owner and manager workflows based on the task you need to complete." />
      <PageSection>
        <PageCard>
          <div className="grid gap-4 md:grid-cols-2">
            <button className="rounded-2xl border border-white/20 bg-slate-900/70 p-5 text-left" onClick={() => void choose("OWNER")} disabled={loading !== null}>
              <p className="text-lg font-semibold text-white">Owner console</p>
              <p className="mt-1 text-sm text-slate-300">Billing, domains, and global tenant controls.</p>
            </button>
            <button className="rounded-2xl border border-sky-300/40 bg-sky-500/10 p-5 text-left" onClick={() => void choose("MANAGER")} disabled={loading !== null}>
              <p className="text-lg font-semibold text-white">Manager console</p>
              <p className="mt-1 text-sm text-slate-300">Classes, members, and daily location operations.</p>
            </button>
          </div>
          {loading ? <p className="mt-4 text-sm text-slate-300">Switching mode...</p> : null}
        </PageCard>
      </PageSection>
    </PageContainer>
  );
}
