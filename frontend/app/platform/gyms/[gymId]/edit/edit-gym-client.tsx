"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  PageHeader,
  PageShell,
} from "../../../../components/ui";
import { apiFetch } from "../../../../lib/api";

type GymForm = {
  name: string;
  timezone: string;
  contactEmail: string;
  phone: string;
  address: string;
  logoUrl: string;
};

type GymTab = "details" | "settings";

type EditGymClientProps = {
  gymId: string;
};

export default function EditGymClient({ gymId }: EditGymClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GymTab>("details");
  const [form, setForm] = useState<GymForm>({
    name: "",
    timezone: "UTC",
    contactEmail: "",
    phone: "",
    address: "",
    logoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGym = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GymForm>(`/api/gyms/${gymId}`);
      setForm({
        name: data.name ?? "",
        timezone: data.timezone ?? "UTC",
        contactEmail: data.contactEmail ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        logoUrl: data.logoUrl ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gym.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gymId) {
      void loadGym();
    }
  }, [gymId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<void>(`/api/gyms/${gymId}`, { method: "PATCH", body: form });
      router.push("/platform/gyms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save gym.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Edit gym"
        subtitle="Update gym details and ownership."
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        }
      />

      {error ? <p className="text-sm text-rose-300" role="alert" aria-live="polite">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading gym...</p>
      ) : (
        <Card title="Gym details">
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeTab === "details" ? "primary" : "secondary"}
              onClick={() => setActiveTab("details")}
            >
              Details
            </Button>
            <Button
              type="button"
              variant={activeTab === "settings" ? "primary" : "secondary"}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="sr-only" aria-live="polite" role="status">{error ?? ""}</p>
            {activeTab === "details" ? (
              <label className="grid gap-2 text-sm text-slate-300">
                Gym name
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm text-slate-300">
                  Timezone
                  <input
                    className="input"
                    value={form.timezone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, timezone: event.target.value }))
                    }
                    placeholder="UTC"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-300">
                  Contact email
                  <input
                    className="input"
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                    }
                    placeholder="owner@example.com"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-300">
                  Phone
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="+1 555-0100"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-300">
                  Address
                  <input
                    className="input"
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    placeholder="123 Main Street"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-300">
                  Logo URL
                  <input
                    className="input"
                    type="url"
                    value={form.logoUrl}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, logoUrl: event.target.value }))
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save gym"}
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
      )}
    </PageShell>
  );
}
