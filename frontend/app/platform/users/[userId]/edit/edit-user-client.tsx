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

type UserForm = {
  email: string;
  role?: string;
};

type EditUserClientProps = {
  userId: string;
};

export default function EditUserClient({ userId }: EditUserClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<UserForm>({
    email: "",
    role: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserForm>(`/users/${userId}`);
      setForm({
        email: data.email ?? "",
        role: data.role ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<void>(`/users/${userId}`, {
        method: "PATCH",
        body: form,
      });
      router.push(`/platform/users/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Edit user"
        subtitle="Update profile details and role assignments."
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading user profile...</p>
      ) : (
        <Card title="User profile">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm text-slate-300">
              Email
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Role
              <input
                className="input"
                value={form.role ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value }))
                }
                placeholder="ADMIN"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/platform/users/${userId}`)}
              >
                Back to details
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageShell>
  );
}
