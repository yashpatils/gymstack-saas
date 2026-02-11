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
    && normalized.includes("not")
    && normalized.includes("config")
  ) {
    return "Billing is not configured yet. Please contact support to upgrade your plan.";
  }

  return message;
}

export default function PlatformBillingPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
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
        const result = await getBillingStatus(user.id);
        if (active) {
          setStatus(result);
        }
      } catch (error) {
        if (active) {
          setMessage(toFriendlyError(error));
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
    () => formatSubscriptionStatus(status?.subscriptionStatus),
    [status?.subscriptionStatus],
  );

  const handleUpgrade = async () => {
    setUpgrading(true);
    setMessage(null);

    try {
      const result = await createCheckout();

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setMessage("Unable to start checkout right now. Please try again later.");
    } catch (error) {
      setMessage(toFriendlyError(error));
    } finally {
      setUpgrading(false);
    }
  };

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

        {loading ? (
          <p className="text-sm text-slate-300">Loading billing status...</p>
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
