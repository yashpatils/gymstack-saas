"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import PageHeader from "../../../src/components/PageHeader";
import { useAuth } from "../../../src/providers/AuthProvider";
import {
  createCheckout,
  getBillingStatus,
  type BillingStatusResponse,
} from "../../../src/lib/billing";
import { formatSubscriptionStatus, isActiveSubscription } from "../../../src/lib/subscription";
import { Button, PageShell } from "../../components/ui";

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
    <ProtectedRoute>
      <PageShell className="max-w-2xl space-y-4 text-white">
        <PageHeader
          title="Billing"
          subtitle="Review subscription status and upgrade options."
          breadcrumbs={[
            { label: "Platform", href: "/platform" },
            { label: "Billing" },
          ]}
        />

        {billingDisabled ? (
          <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Billing not enabled
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-40" />
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Subscription status</p>
            <p className="mt-2 text-lg font-semibold text-white">{currentStatus}</p>
          </div>
        )}

        {!isActiveSubscription(status?.subscriptionStatus) ? (
          <Button type="button" onClick={handleUpgrade} disabled={upgrading} variant="secondary">
            {upgrading ? "Starting checkout..." : "Upgrade"}
          </Button>
        ) : null}

        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      </PageShell>
    </ProtectedRoute>
  );
}
