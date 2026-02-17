"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../src/components/PageHeader";
import { apiFetch, ApiFetchError } from "@/src/lib/apiFetch";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
};

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
  const [workingPlan, setWorkingPlan] = useState<string | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentPlanName = useMemo(() => {
    if (!status?.priceId) {
      return "No active plan";
    }

    if (status.priceId === starterPriceId) {
      return PLAN_NAMES.starter;
    }
    if (status.priceId === proPriceId) {
      return PLAN_NAMES.pro;
    }

    return "Custom";
  }, [proPriceId, starterPriceId, status?.priceId]);

  async function loadStatus() {
    setLoading(true);
    setMessage(null);

    try {
      const nextStatus = await apiFetch<BillingStatus>("/api/billing/status", {
        method: "GET",
        cache: "no-store",
      });
      setStatus(nextStatus);
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 401) {
          window.location.assign("/login");
          return;
        }
        if (error.statusCode === 403) {
          setMessage("You do not have access to billing for this tenant.");
          return;
        }
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
        body: {
          priceId,
          successUrl: `${window.location.origin}/platform/billing`,
          cancelUrl: `${window.location.origin}/platform/billing`,
        },
      });

      window.location.assign(response.url);
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 401) {
          window.location.assign("/login");
          return;
        }
        if (error.statusCode === 403) {
          setMessage("Only tenant owners can change billing.");
          return;
        }
      }

      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setWorkingPlan(null);
    }
  }

  async function openPortal() {
    setMessage(null);

    try {
      const response = await apiFetch<{ url: string }>("/api/billing/portal", {
        method: "POST",
        body: {
          returnUrl: `${window.location.origin}/platform/billing`,
        },
      });
      window.location.assign(response.url);
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 501) {
        setMessage("Portal is unavailable for this provider. Please contact support to manage billing.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Unable to open billing portal.");
    }
  }

  async function updateProvider(provider: "STRIPE" | "RAZORPAY") {
    setProviderLoading(true);
    setMessage(null);

    try {
      await apiFetch<{ billingProvider: "STRIPE" | "RAZORPAY" }>("/api/tenant/billing-provider", {
        method: "PATCH",
        body: {
          billingProvider: provider,
          billingCountry: status?.billingCountry ?? (provider === "RAZORPAY" ? "IN" : undefined),
          billingCurrency: provider === "RAZORPAY" ? "INR" : undefined,
        },
      });
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update billing provider.");
    } finally {
      setProviderLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page space-y-6">
      <PageHeader title="Billing" subtitle="Manage your GymStack subscription and white-label eligibility." />

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className="button" type="button" onClick={() => void loadStatus()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh status"}
          </button>
          <button className="button secondary" type="button" onClick={() => void openPortal()}>
            Manage billing
          </button>
        </div>

        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-slate-400">Current plan</dt><dd>{currentPlanName}</dd></div>
          <div><dt className="text-slate-400">Provider</dt><dd>{status?.provider ?? "STRIPE"}</dd></div>
          <div><dt className="text-slate-400">Subscription status</dt><dd>{status?.subscriptionStatus ?? "Not subscribed"}</dd></div>
          <div><dt className="text-slate-400">Renews on</dt><dd>{status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : "—"}</dd></div>
          <div><dt className="text-slate-400">White-label eligibility</dt><dd>{status?.whiteLabelEligible ? "Eligible" : "Upgrade to Pro"}</dd></div>
        </dl>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Billing provider</h2>
        {status?.billingCountry === "IN" ? (
          <p className="text-sm text-indigo-200">Use Razorpay for local India payment experience.</p>
        ) : null}
        <div className="flex gap-2">
          <button className="button" type="button" disabled={providerLoading || status?.provider === "STRIPE"} onClick={() => void updateProvider("STRIPE")}>Use Stripe</button>
          <button className="button secondary" type="button" disabled={providerLoading || status?.provider === "RAZORPAY"} onClick={() => void updateProvider("RAZORPAY")}>Use Razorpay</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="card space-y-3">
          <h2 className="section-title">Starter</h2>
          <p className="text-sm text-slate-300">Core tenant billing. White-label is not included.</p>
          <button
            className="button"
            type="button"
            disabled={!starterPriceId || workingPlan === starterPriceId}
            onClick={() => void beginCheckout(starterPriceId)}
          >
            {workingPlan === starterPriceId ? "Redirecting..." : "Choose Starter"}
          </button>
        </article>

        <article className="card space-y-3 border border-indigo-400/40">
          <h2 className="section-title">Pro</h2>
          <p className="text-sm text-slate-300">Includes white-label upgrade and premium controls.</p>
          <button
            className="button"
            type="button"
            disabled={!proPriceId || workingPlan === proPriceId}
            onClick={() => void beginCheckout(proPriceId)}
          >
            {workingPlan === proPriceId ? "Redirecting..." : "Upgrade to Pro"}
          </button>
        </article>
      </div>

      {!status?.whiteLabelEligible ? (
        <div className="card border border-indigo-400/40 bg-indigo-500/10">
          <p className="text-sm text-indigo-100">Need to remove Gym Stack branding? Upgrade to Pro to unlock white-label.</p>
          <button className="button mt-3 w-fit" type="button" onClick={() => void beginCheckout(proPriceId)}>
            Upgrade to Pro
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-rose-300">{message}</p> : null}
    </section>
  );
}
