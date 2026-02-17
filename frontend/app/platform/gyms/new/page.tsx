"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  PageHeader,
  PageShell,
} from "../../../components/ui";
import { getBillingStatus } from "../../../../src/lib/billing";
import { formatSubscriptionStatus, isActiveSubscription } from "../../../../src/lib/subscription";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { ApiFetchError, apiFetch } from "@/src/lib/apiFetch";
import { useToast } from "../../../../src/components/toast/ToastProvider";
import type { Gym } from "../../../../src/types/gym";
import { listGyms } from "../../../../src/lib/gyms";
import { UpgradeModal } from "../../../../src/components/common/UpgradeModal";

type GymForm = {
  name: string;
};

export default function NewGymPage() {
  const { user, activeTenant, activeContext, chooseContext } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<GymForm>({
    name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [existingGymCount, setExistingGymCount] = useState(0);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [upgradeErrorCode, setUpgradeErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSubscriptionStatus(null);
      return;
    }

    getBillingStatus(user.id)
      .then((status) => setSubscriptionStatus(status.subscriptionStatus ?? null))
      .catch(() => setSubscriptionStatus(null));

    listGyms()
      .then((gyms) => {
        setExistingGymCount(gyms.length);
        if (gyms.length >= 1) {
          setShowUpgradeNudge(true);
        }
      })
      .catch(() => setExistingGymCount(0));
  }, [user?.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const createdGym = await apiFetch<Gym>("/api/gyms", { method: "POST", body: form });
      const tenantId = activeTenant?.id ?? activeContext?.tenantId;
      if (tenantId) {
        await chooseContext(tenantId, createdGym.id);
      }
      toast.success("Gym created", "Entering your new gym workspace.");
      router.push(`/platform/gyms/${createdGym.id}`);
    } catch (err) {
      if (err instanceof ApiFetchError) {
        const code = err.details && typeof err.details === "object" && "code" in err.details && typeof err.details.code === "string" ? err.details.code : null;
        if (code === "LIMIT_LOCATIONS_REACHED" || code === "UPGRADE_REQUIRED" || code === "SUBSCRIPTION_INACTIVE") {
          setUpgradeErrorCode(code);
          setShowUpgradeNudge(true);
        }
      }
      const errorMessage = err instanceof Error ? err.message : "Unable to create gym.";
      setError(errorMessage);
      toast.error("Create gym failed", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Create gym"
        subtitle="Add a new gym location to the platform."
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        }
      />

      {error ? <p className="text-sm text-rose-300" role="alert" aria-live="polite">{error}</p> : null}

      {subscriptionStatus ? (
        <p className="text-xs text-slate-400">
          Usage is enforced by plan limits. You can view exact limits from Billing.
        </p>
      ) : null}

      {!isActiveSubscription(subscriptionStatus) ? (
        <Card
          title="Need more gyms? Upgrade your plan"
          description={`Current plan: ${formatSubscriptionStatus(subscriptionStatus)}`}
        >
          <p className="text-sm text-slate-300">
            You can create your first gym on any plan. Upgrade to active to add more locations.
          </p>
          <div className="mt-4">
            <Link href="/platform/billing">
              <Button>Upgrade</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card title="Gym details">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="sr-only" aria-live="polite" role="status">{error ?? ""}</p>
          <label className="grid gap-2 text-sm text-slate-300" htmlFor="gym-name">
            Gym name
            <input
              id="gym-name"
              className="input"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create gym"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/platform/gyms")}
            >
              Back to list
            </Button>
          </div>
        </form>
      </Card>
      <UpgradeModal
        open={showUpgradeNudge && (existingGymCount >= 1 || Boolean(upgradeErrorCode))}
        title="Planning to expand to more locations?"
        description="Pro gives you expansion controls and white-label options for multi-location growth."
        errorCode={upgradeErrorCode}
        onClose={() => { setShowUpgradeNudge(false); setUpgradeErrorCode(null); }}
      />
    </PageShell>
  );
}
