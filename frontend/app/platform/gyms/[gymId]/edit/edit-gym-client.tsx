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
};

type EditGymClientProps = {
  gymId: string;
};

export default function EditGymClient({ gymId }: EditGymClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<GymForm>({
    name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGym = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GymForm>(`/gyms/${gymId}`);
      setForm({
        name: data.name ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gym.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gymId) {
      loadGym();
    }
  }, [gymId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}`, { method: "PATCH", body: form });
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

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading gym...</p>
      ) : (
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
