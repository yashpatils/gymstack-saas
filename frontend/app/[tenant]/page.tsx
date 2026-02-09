"use client";

import {
  PageShell,
  SectionTitle,
  StatCard,
} from "../components/ui";
import { TenantRoleSnapshot } from "../components/tenant-role-snapshot";
import { TenantHomeHeader } from "./tenant-home-header";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TenantHomePage({
  params,
}: {
  params: { tenant: string };
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <PageShell>
      <TenantHomeHeader />

      <div className="grid grid-3">
        <StatCard
          label="Daily check-ins"
          value="186"
          detail="Members checked in so far today."
        />
        <StatCard
          label="Trainer sessions"
          value="42"
          detail="Sessions scheduled for the next 24 hours."
        />
        <StatCard
          label="Renewals due"
          value="18"
          detail="Memberships expiring in the next 7 days."
        />
      </div>

      <section className="section">
        <SectionTitle>Recommended next steps</SectionTitle>
        <div className="grid grid-2">
          <div className="card">
            <h3>Review at-risk members</h3>
            <p>Identify low-activity members and trigger outreach campaigns.</p>
          </div>
          <div className="card">
            <h3>Update trainer coverage</h3>
            <p>Confirm coverage for peak evening times this week.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle>Role-based access snapshot</SectionTitle>
        <TenantRoleSnapshot tenantSlug={params.tenant} />
      </section>
    </PageShell>
  );
}
