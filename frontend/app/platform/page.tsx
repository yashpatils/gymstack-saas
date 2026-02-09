"use client";

import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  StatCard,
} from "../components/ui";
import { useBackendAction } from "../components/use-backend-action";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformOverviewPage() {
  const { backendResponse, callBackend } = useBackendAction();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <PageShell>
      <PageHeader
        title="Platform Overview"
        subtitle="Track tenant success, revenue, and platform reliability at a glance."
        actions={
          <Button onClick={() => callBackend("Generate report")}>
            Generate report
          </Button>
        }
      />
      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}

      <div className="grid grid-3">
        <StatCard
          label="Active tenants"
          value="47"
          detail="Healthy adoption across three regions."
        />
        <StatCard
          label="Monthly platform revenue"
          value="$19.4k"
          detail="Includes usage and add-on services."
        />
        <StatCard
          label="Support response time"
          value="1.4 hrs"
          detail="Median time to first response this week."
        />
      </div>

      <section className="section">
        <SectionTitle>Operational focus</SectionTitle>
        <div className="grid grid-2">
          <Card
            title="Onboarding pipeline"
            description="6 tenants in implementation with go-live checklists."
            footer={<Badge tone="warning">2 delayed</Badge>}
          />
          <Card
            title="Platform uptime"
            description="99.98% uptime over the last 30 days."
            footer={<Badge tone="success">On target</Badge>}
          />
        </div>
      </section>
    </PageShell>
  );
}
