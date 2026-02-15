"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { useAuth } from "@/src/providers/AuthProvider";

export default function PlatformAccountPage() {
  const { user, memberships, activeContext, platformRole, tenantFeatures } = useAuth();

  const membershipSummary = useMemo(() => {
    const byRole = memberships.reduce<Record<string, number>>((accumulator, membership) => {
      accumulator[membership.role] = (accumulator[membership.role] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(byRole)
      .map(([role, count]) => `${role} (${count})`)
      .join(" • ");
  }, [memberships]);

  const canSwitchWorkspace = memberships.length > 1;

  return (
    <section className="space-y-6">
      <PageHeader title="Account info" subtitle="Your user profile, workspace context, and membership summary." />

      <SectionCard title="Profile">
        <dl className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
            <dd className="mt-1 font-medium text-white">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-1 font-medium text-white">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Platform role</dt>
            <dd className="mt-1">{platformRole ?? "Standard user"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Memberships</dt>
            <dd className="mt-1">{membershipSummary || "No memberships"}</dd>
          </div>
        </dl>
      </SectionCard>



      <SectionCard title="Add-ons">
        <p className="text-sm text-slate-200">White Label Branding: <span className="font-semibold text-white">{tenantFeatures?.whiteLabelBranding ? "Enabled" : "Disabled"}</span></p>
        <p className="mt-2 text-xs text-slate-400">Upgrade in Billing to remove Gym Stack branding on custom domains for staff/client views.</p>
      </SectionCard>

      <SectionCard title="Active workspace context">
        <dl className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Active tenant id</dt>
            <dd className="mt-1 font-mono text-xs text-slate-100">{activeContext?.tenantId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Active location id</dt>
            <dd className="mt-1 font-mono text-xs text-slate-100">{activeContext?.locationId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Active role</dt>
            <dd className="mt-1">{activeContext?.role ?? "—"}</dd>
          </div>
        </dl>

        {canSwitchWorkspace ? (
          <div className="mt-4">
            <Link href="/select-workspace" className="button secondary button-sm">Switch workspace</Link>
          </div>
        ) : null}
      </SectionCard>
    </section>
  );
}
