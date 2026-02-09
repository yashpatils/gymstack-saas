"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  PageHeader,
  PageShell,
} from "../../../components/ui";
import { apiFetch } from "../../../lib/api";

type GymForm = {
  name: string;
};

export default function NewGymPage() {
  const router = useRouter();
  const [form, setForm] = useState<GymForm>({
    name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/gyms", { method: "POST", body: form });
      router.push("/platform/gyms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create gym.");
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

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Card title="Gym details">
        <form className="space-y-4" onSubmit={handleSubmit}>
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
