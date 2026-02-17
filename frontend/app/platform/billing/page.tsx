"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiFetchError } from "@/src/lib/apiFetch";
import { LoadingState } from "../../../src/components/common/LoadingState";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { PrimaryButton } from "../../../src/components/common/PrimaryButton";
import { SectionCard } from "../../../src/components/common/SectionCard";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
};

type BillingStatus = {
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
  const [workingPlan, setWorkingPlan] = useState<string | null>(null);
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
      if (error instanceof ApiFetchError && error.statusCode === 401) {
        window.location.assign("/login");
        return;
      }
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setMessage("You do not have access to billing for this tenant.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Could not load billing status.");
    } finally {
      setLoading(false);
    }
  }

  async function beginCheckout(priceId: string) {
    setWorkingPlan(priceId);
    setMessage(null);
    try {
      const response = await apiFetch<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body: { priceId, successUrl: `${window.location.origin}/platform/billing`, cancelUrl: `${window.location.origin}/platform/billing` },
      });
      window.location.assign(response.url);
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 401) {
        window.location.assign("/login");
        return;
      }
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setMessage("Only tenant owners can change billing.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setWorkingPlan(null);
    }
  }

  async function openPortal() {
    setMessage(null);
    try {
      const response = await apiFetch<{ url: string }>("/api/billing/portal", { method: "POST", body: { returnUrl: `${window.location.origin}/platform/billing` } });
      window.location.assign(response.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open billing portal.");
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <section className="space-y-6">
      <PageHeader title="Billing" subtitle="Manage your Gym Stack subscription and white-label eligibility." />

      <SectionCard title="Subscription status" actions={<div className="flex gap-2"><PrimaryButton onClick={() => void loadStatus()} disabled={loading}>{loading ? "Refreshing..." : "Refresh status"}</PrimaryButton><button className="button secondary" type="button" onClick={() => void openPortal()}>Manage billing</button></div>}>
        {loading && !status ? <LoadingState label="Loading billing details..." /> : null}
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-slate-400">Current plan</dt><dd>{currentPlanName}</dd></div>
          <div><dt className="text-slate-400">Subscription status</dt><dd>{status?.subscriptionStatus ?? "Not subscribed"}</dd></div>
          <div><dt className="text-slate-400">Renews on</dt><dd>{status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : "—"}</dd></div>
          <div><dt className="text-slate-400">White-label eligibility</dt><dd>{status?.whiteLabelEligible ? "Eligible" : "Upgrade to Pro"}</dd></div>
        </dl>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Starter">
          <p className="text-sm text-slate-300">Core tenant billing. White-label is not included.</p>
          <PrimaryButton disabled={!starterPriceId || workingPlan === starterPriceId} onClick={() => void beginCheckout(starterPriceId)}>
            {workingPlan === starterPriceId ? "Redirecting..." : "Choose Starter"}
          </PrimaryButton>
        </SectionCard>
        <SectionCard title="Pro" className="section-card-featured">
          <p className="text-sm text-slate-300">Includes white-label upgrade and premium controls.</p>
          <PrimaryButton disabled={!proPriceId || workingPlan === proPriceId} onClick={() => void beginCheckout(proPriceId)}>
            {workingPlan === proPriceId ? "Redirecting..." : "Upgrade to Pro"}
          </PrimaryButton>
        </SectionCard>
      </div>

      {message ? <p className="text-sm text-rose-300">{message}</p> : null}
    </section>
  );
}
