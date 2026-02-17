"use client";

import { useEffect, useMemo, useState } from "react";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { ErrorState, LoadingState, StatCard } from "../../../src/components/platform/data";
import { FormActions } from "../../../src/components/platform/form";
import { apiFetch, ApiFetchError } from "@/src/lib/apiFetch";

const PLAN_NAMES: Record<string, string> = { starter: "Starter", pro: "Pro" };

type BillingStatus = {
  provider: "STRIPE" | "RAZORPAY";
  billingCountry: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  priceId: string | null;
  whiteLabelEligible: boolean;
  whiteLabelEnabled: boolean;
};

export default function BillingPage() {
  const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "";
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "";
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentPlanName = useMemo(() => {
    if (!status?.priceId) return "No active plan";
    if (status.priceId === starterPriceId) return PLAN_NAMES.starter;
    if (status.priceId === proPriceId) return PLAN_NAMES.pro;
    return "Custom";
  }, [proPriceId, starterPriceId, status?.priceId]);

  async function loadStatus() {
    setLoading(true);
    setMessage(null);
    try {
      const nextStatus = await apiFetch<BillingStatus>("/api/billing/status", { method: "GET", cache: "no-store" });
      setStatus(nextStatus);
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setMessage("You do not have access to billing for this tenant.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not load billing status.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadStatus(); }, []);

  return (
    <PageContainer>
      <PageHeader title="Billing" description="Manage your subscription and white-label readiness." actions={<button className="button" onClick={() => void loadStatus()} type="button">Refresh</button>} />
      {message ? <ErrorState message={message} /> : null}
      {loading ? <LoadingState message="Loading billing status..." /> : null}

      <PageGrid columns={4}>
        <StatCard label="Current plan" value={currentPlanName} />
        <StatCard label="Status" value={status?.subscriptionStatus ?? "Not subscribed"} />
        <StatCard label="Renews" value={status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : "—"} />
        <StatCard label="White-label" value={status?.whiteLabelEligible ? "Eligible" : "Upgrade required"} />
      </PageGrid>

      <PageCard title="Plan options">
        <FormActions>
          <button type="button" className="button secondary" disabled={!starterPriceId}>Starter</button>
          <button type="button" className="button" disabled={!proPriceId}>Pro</button>
        </FormActions>
      </PageCard>
    </PageContainer>
  );
}
