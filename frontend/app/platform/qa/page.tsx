"use client";

import { useAuth } from "../../../src/providers/AuthProvider";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="text-right font-mono text-slate-100">{value}</span>
    </div>
  );
}

export default function QaStatusPage() {
  const { user, activeContext, activeTenant, qaBypass, effectiveAccess, gatingStatus, qaModeEnabled } = useAuth();

  if (!qaModeEnabled) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">QA status</h1>
        <p className="text-sm text-slate-300">QA mode is disabled for this environment.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">QA status</h1>
        <p className="text-sm text-slate-300">Visible only when QA_MODE=true. Shows live auth and access-gating context.</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-medium">Current session</h2>
        <StatRow label="Current user" value={user?.email ?? "n/a"} />
        <StatRow label="Role" value={user?.role ?? activeContext?.role ?? "n/a"} />
        <StatRow label="qaBypass flag" value={String(qaBypass)} />
        <StatRow label="Active tenant" value={activeTenant?.id ?? activeContext?.tenantId ?? "n/a"} />
        <StatRow label="Active org name" value={activeTenant?.name ?? "n/a"} />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-medium">Subscription & trial</h2>
        <StatRow label="Subscription status" value={activeTenant?.subscriptionStatus ?? "n/a"} />
        <StatRow label="Trial starts" value={activeTenant?.trialStartedAt ?? "n/a"} />
        <StatRow label="Trial ends" value={activeTenant?.trialEndsAt ?? "n/a"} />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-medium">Effective access</h2>
        <StatRow label="Bypass active (effective access)" value={String(effectiveAccess ?? false)} />
        <StatRow label="Would be blocked" value={String(gatingStatus?.wouldBeBlocked ?? false)} />
        <StatRow label="Gating reason" value={gatingStatus?.reasonCode ?? "OK"} />
      </section>
    </main>
  );
}
