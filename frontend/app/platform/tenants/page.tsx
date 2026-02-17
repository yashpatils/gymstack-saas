"use client";

import { useEffect, useState } from "react";
import { Badge, Card, PageHeader, PageShell, SectionTitle, Table } from "../../components/ui";
import { apiFetch } from "@/src/lib/apiFetch";

type WatchItem = { tenantId: string; tenantName: string; billingStatus: "PAST_DUE" | "GRACE_PERIOD" | "FROZEN"; gracePeriodEndsAt: string | null };

export default function PlatformTenantsPage() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    void apiFetch<{ items: WatchItem[] }>("/api/admin/billing-watchlist", { method: "GET", cache: "no-store" })
      .then((response) => setItems(response.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <PageShell>
      <PageHeader title="Tenant Billing Watchlist" subtitle="Tenants in past_due, grace_period, or frozen states." />
      <div className="grid grid-3">
        <Card title="Past due" description={`${items.filter((item) => item.billingStatus === "PAST_DUE").length} tenants`} />
        <Card title="Grace period" description={`${items.filter((item) => item.billingStatus === "GRACE_PERIOD").length} tenants`} />
        <Card title="Frozen" description={`${items.filter((item) => item.billingStatus === "FROZEN").length} tenants`} />
      </div>

      <section className="section">
        <SectionTitle>Billing action queue</SectionTitle>
        <Card title="At-risk tenants" description="Open tenant billing for recovery actions.">
          <Table
            headers={["Tenant", "Status", "Grace ends", "Action"]}
            rows={items.map((item) => [
              item.tenantName,
              <Badge tone={item.billingStatus === "FROZEN" ? "warning" : "default"}>{item.billingStatus}</Badge>,
              item.gracePeriodEndsAt ? new Date(item.gracePeriodEndsAt).toLocaleDateString() : "-",
              <a className="underline" href={`/platform/billing?tenantId=${item.tenantId}`}>Open tenant billing</a>,
            ])}
          />
        </Card>
      </section>
    </PageShell>
  );
}
