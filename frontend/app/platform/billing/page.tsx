"use client";

import { useEffect, useMemo, useState } from "react";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { ErrorState, LoadingState, StatCard } from "../../../src/components/platform/data";
import { FormActions } from "../../../src/components/platform/form";
import { apiFetch, ApiFetchError } from "@/src/lib/apiFetch";

const PLAN_NAMES: Record<string, string> = { starter: "Starter", pro: "Pro" };

type BillingStatus = {
  billingStatus: "ACTIVE" | "TRIALING" | "PAST_DUE" | "GRACE_PERIOD" | "FROZEN" | "CANCELED";
  gracePeriodEndsAt: string | null;
  planKey: string;
  planName: string;
  provider: "STRIPE" | "RAZORPAY";
  billingCountry: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  priceId: string | null;
  whiteLabelEligible: boolean;
  whiteLabelEnabled: boolean;
  usage: {
    locationsUsed: number;
    maxLocations: number;
    staffSeatsUsed: number;
    maxStaffSeats: number;
  };
};

export default function BillingPage() {
  const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "";
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "";
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<"starter" | "pro" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentPlanName = useMemo(() => {
    if (!status) return "No active plan";
    return status.planName;
  }, [status]);

  const isTrialing = status?.subscriptionStatus === "TRIAL" || status?.billingStatus === "TRIALING";
  const isPastDue = status?.subscriptionStatus === "PAST_DUE" || status?.billingStatus === "PAST_DUE";

  async function loadStatus() {
    setLoading(true);
    setMessage(null);
    try {
      const nextStatus = await apiFetch<BillingStatus>("/api/billing/org/status", { method: "GET", cache: "no-store" });
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

  async function startCheckout(plan: "starter" | "pro") {
    const priceId = plan === "starter" ? starterPriceId : proPriceId;
    if (!priceId) {
      setMessage(`${PLAN_NAMES[plan]} plan is not currently available.`);
      return;
    }

    setCheckoutLoading(plan);
    setMessage(null);
    try {
      const response = await apiFetch<{ url?: string; checkoutUrl?: string; sessionId?: string }>('/api/billing/org/checkout-session', {
        method: 'POST',
        body: {
          priceId,
          successUrl: `${window.location.origin}/platform/billing?checkout=success`,
          cancelUrl: `${window.location.origin}/platform/billing?checkout=canceled`,
        },
      });

      const redirectUrl = response.url ?? response.checkoutUrl;
      if (!redirectUrl) {
        throw new Error('Checkout session was created without a redirect URL.');
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function openPortal() {
    try {
      const response = await apiFetch<{ url: string }>("/api/billing/org/portal-session", {
        method: "POST",
        body: { returnUrl: window.location.href },
      });
      window.location.href = response.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open billing portal.");
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Billing" description="Manage your subscription and plan limits." actions={<button className="button" onClick={() => void loadStatus()} type="button">Refresh</button>} />
      {message ? <ErrorState message={message} /> : null}
      {loading ? <LoadingState message="Loading billing status..." /> : null}

      <PageGrid columns={4}>
        <StatCard label="Current plan" value={currentPlanName} />
        <StatCard label="Status" value={status?.billingStatus ?? status?.subscriptionStatus ?? "Not subscribed"} />
        <StatCard label="Locations" value={status ? `${status.usage.locationsUsed}/${status.usage.maxLocations}` : "—"} />
        <StatCard label="Staff seats" value={status ? `${status.usage.staffSeatsUsed}/${status.usage.maxStaffSeats}` : "—"} />
      </PageGrid>

      {isTrialing ? <p className="text-xs text-muted-foreground">You are currently in trial. Add a payment method to avoid interruptions.</p> : null}
      {isPastDue ? <p className="text-xs text-destructive">Payment is past due. Access to non-billing features is restricted until payment is updated.</p> : null}

      <PageCard title="Plan options">
        <FormActions>
          <button type="button" className="button secondary" disabled={checkoutLoading !== null} onClick={() => void startCheckout("starter")}>{checkoutLoading === "starter" ? "Starting..." : "Starter"}</button>
          <button type="button" className="button" disabled={checkoutLoading !== null} onClick={() => void startCheckout("pro")}>{checkoutLoading === "pro" ? "Starting..." : "Pro"}</button>
          <button type="button" className="button secondary" onClick={() => void openPortal()}>Update payment method</button>
          <button type="button" className="button" onClick={() => void openPortal()}>Retry payment</button>
        </FormActions>
        <p className="mt-3 text-xs text-muted-foreground">White-label enabled: {status?.whiteLabelEnabled ? "Yes" : "No"}</p>
        <p className="mt-2 inline-flex rounded-full border border-border px-2 py-1 text-xs text-foreground">Current status: {status?.billingStatus ?? "ACTIVE"}</p>
      </PageCard>
    </PageContainer>
  );
}
