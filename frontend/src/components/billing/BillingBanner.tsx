"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

type BillingStatusPayload = {
  billingStatus: "ACTIVE" | "TRIALING" | "PAST_DUE" | "GRACE_PERIOD" | "FROZEN" | "CANCELED";
  gracePeriodEndsAt: string | null;
};

export function BillingBanner() {
  const [status, setStatus] = useState<BillingStatusPayload | null>(null);
  useEffect(() => {
    let mounted = true;
    void apiFetch<BillingStatusPayload>("/api/billing/status", { method: "GET", cache: "no-store" })
      .then((response) => {
        if (mounted) setStatus(response);
      })
      .catch(() => {
        if (mounted) setStatus(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const message = useMemo(() => {
    if (!status) return null;
    if (status.billingStatus === "PAST_DUE") return "Payment failed — update card";
    if (status.billingStatus === "GRACE_PERIOD") {
      const daysLeft = status.gracePeriodEndsAt
        ? Math.max(0, Math.ceil((new Date(status.gracePeriodEndsAt).getTime() - Date.now()) / 86400000))
        : 0;
      return `Grace period ends in ${daysLeft} days`;
    }
    if (status.billingStatus === "FROZEN") return "Account restricted";
    return null;
  }, [status]);

  if (!message) return null;
  return <div className="border-b border-amber-500/40 bg-amber-600/20 px-4 py-2 text-sm text-amber-100">{message} <a className="underline" href="/platform/billing">Open billing</a></div>;
}
