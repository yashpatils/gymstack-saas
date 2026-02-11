"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, PageHeader, PageShell } from "../../../components/ui";
import { Gym, deleteGym, getGym, updateGym } from "../../../../src/lib/gyms";
import { useToast } from "../../../../src/components/toast/ToastProvider";

type GymDetailClientProps = {
  gymId: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default function GymDetailClient({ gymId }: GymDetailClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [gym, setGym] = useState<Gym | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGym = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGym(gymId);
      setGym(data);
      setName(data.name ?? "");
    } catch (err) {
      setGym(null);
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Gym name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedGym = await updateGym(gymId, { name: name.trim() });
      setGym(updatedGym);
      setName(updatedGym.name);
      toast.success("Gym updated", "Gym details were saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save gym.";
      setError(message);
      toast.error("Update gym failed", message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteGym(gymId);
      toast.success("Gym deleted", "Gym was removed from the platform.");
      router.push("/platform/gyms");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete gym.";
      setError(message);
      toast.error("Delete gym failed", message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Gym details"
        subtitle={gym?.name ?? "Review and update this gym."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push("/platform/gyms")}>
              Back
            </Button>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)} disabled={!gym || deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading gym details...</p>
      ) : !gym ? (
        <p className="text-sm text-slate-400">Gym not found.</p>
      ) : (
        <Card title="Gym profile" description="Update core gym details.">
          <form className="space-y-4" onSubmit={handleSave}>
            <label className="grid gap-2 text-sm text-slate-300">
              Gym name
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <div className="space-y-1 text-xs text-slate-400">
              <p>ID: {gym.id}</p>
              <p>Owner ID: {gym.ownerId}</p>
              <p>Created: {formatDate(gym.createdAt)}</p>
              <p>Updated: {formatDate(gym.updatedAt)}</p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </Card>
      )}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <Card title="Delete gym?" description="This action cannot be undone.">
            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete {gym?.name ?? "this gym"}?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm delete"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
