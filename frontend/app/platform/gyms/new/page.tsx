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
import { apiFetch } from "../../../lib/api";
import { useToast } from "../../../../src/components/toast/ToastProvider";
import { me } from "../../../../src/lib/auth";

type GymForm = {
  name: string;
};

export default function NewGymPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<GymForm>({
    name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSubscriptionStatus(null);
      return;
    }

    getBillingStatus(user.id)
      .then((status) => setSubscriptionStatus(status.subscriptionStatus ?? null))
      .catch(() => setSubscriptionStatus(null));
  }, [user?.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<void>("/api/gyms", { method: "POST", body: form });
      const profile = await me();
      toast.success("Gym created", "The gym was added successfully.");
      if (profile.onboarding?.needsOpsChoice) {
        router.push("/platform/onboarding");
        return;
      }
      router.push("/platform/gyms");
    } catch (err) {
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
    </PageShell>
  );
}
