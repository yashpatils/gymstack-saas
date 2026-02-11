"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/providers/AuthProvider";
import { apiFetch } from "../../../src/lib/api";

type BillingStatusResponse = {
  subscriptionStatus?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

type AuthMeResponse = {
  id: string;
  email: string;
  subscriptionStatus?: string;
  stripeConfigured?: boolean;
};

type CheckoutResponse = {
  checkoutUrl?: string | null;
  sessionId?: string;
};

type Plan = {
  name: "Free" | "Pro" | "Business";
  priceLabel: string;
  features: string[];
  priceId?: string;
  ctaLabel: string;
};

const plans: Plan[] = [
  {
    name: "Free",
    priceLabel: "$0 / month",
    features: ["1 gym", "Basic scheduling", "Community support"],
    ctaLabel: "Current tier",
  },
  {
    name: "Pro",
    priceLabel: "$49 / month",
    features: ["Up to 5 gyms", "Advanced reports", "Email support"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    ctaLabel: "Upgrade to Pro",
  },
  {
    name: "Business",
    priceLabel: "$149 / month",
    features: ["Unlimited gyms", "Priority support", "Custom onboarding"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    ctaLabel: "Upgrade to Business",
  },
];

function formatStatus(status?: string): string {
  if (!status) {
    return "Free";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("stripe")
    && (normalized.includes("disabled") || normalized.includes("not configured"))
  ) {
    return "Billing not enabled";
  }

  if (normalized.includes("404") || normalized.includes("not found")) {
    return "Billing API is not available in this environment yet.";
  }

  return message;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return <p className="text-sm text-slate-300">Loading session...</p>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
        You are not logged in. Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}

export default function PlatformBillingPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [checkoutAvailable, setCheckoutAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadStatus = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const me = await apiFetch<AuthMeResponse>("/api/auth/me", { method: "GET" });
        if (!active) {
          return;
        }

        if (typeof me.subscriptionStatus === "string") {
          setStatus((prev) => ({ ...prev, subscriptionStatus: me.subscriptionStatus }));
        }

        if (typeof me.stripeConfigured === "boolean") {
          setStripeConfigured(me.stripeConfigured);
        }
      } catch {
        // Best-effort only; billing status route can still provide subscription data.
      }

      try {
        const result = await apiFetch<BillingStatusResponse>(`/api/billing/status/${user.id}`, {
          method: "GET",
        });
        if (active) {
          setStatus(result);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        const friendly = toFriendlyError(error);
        setMessage(friendly);

        if (friendly === "Billing not enabled") {
          setStripeConfigured(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const currentStatus = useMemo(
    () => formatStatus(status?.subscriptionStatus),
    [status?.subscriptionStatus],
  );

  const handleCheckout = async (plan: Plan) => {
    if (!user?.id || !plan.priceId) {
      return;
    }

    setUpgradingPlan(plan.name);
    setMessage(null);

    try {
      const result = await apiFetch<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          priceId: plan.priceId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setMessage("Checkout endpoint is available but did not return a checkout URL.");
    } catch (error) {
      const friendly = toFriendlyError(error);
      setMessage(friendly);

      if (friendly === "Billing API is not available in this environment yet.") {
        setCheckoutAvailable(false);
      }

      if (friendly === "Billing not enabled") {
        setStripeConfigured(false);
      }
    } finally {
      setUpgradingPlan(null);
    }
  };

  const billingDisabled = stripeConfigured === false;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 text-white">
      <RequireAuth>
        <h1 className="text-2xl font-semibold">Billing</h1>

        {billingDisabled ? (
          <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Billing not enabled
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-300">Loading billing status...</p>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Subscription status</p>
            <p className="mt-2 text-lg font-semibold text-white">{currentStatus}</p>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentStatus.toLowerCase() === plan.name.toLowerCase();
            const disabled =
              !plan.priceId ||
              billingDisabled ||
              !checkoutAvailable ||
              isCurrent ||
              upgradingPlan !== null;

            return (
              <article
                key={plan.name}
                className="flex h-full flex-col rounded-lg border border-white/10 bg-slate-900/40 p-4"
              >
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-300">{plan.priceLabel}</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  {plan.priceId ? (
                    <button
                      type="button"
                      onClick={() => void handleCheckout(plan)}
                      disabled={disabled}
                      className="rounded-md border border-white/20 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {upgradingPlan === plan.name ? "Starting checkout..." : plan.ctaLabel}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-300">{plan.ctaLabel}</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {!checkoutAvailable ? (
          <p className="text-sm text-amber-300">
            Checkout is unavailable because /api/billing/checkout is not present.
          </p>
        ) : null}

        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      </RequireAuth>
    </main>
  );
}
