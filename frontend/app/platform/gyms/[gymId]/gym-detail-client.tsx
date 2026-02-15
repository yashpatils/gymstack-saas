"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../../src/components/common/EmptyState";
import { PageHeader } from "../../../../src/components/common/PageHeader";
import { SectionCard } from "../../../../src/components/common/SectionCard";
import { deleteGym, getGym, type Gym, updateGym } from "../../../../src/lib/gyms";
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

  useEffect(() => {
    let active = true;

    const loadGym = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGym(gymId);
        if (!active) {
          return;
        }
        setGym(data);
        setName(data.name ?? "");
      } catch (err) {
        if (active) {
          setGym(null);
          setError(err instanceof Error ? err.message : "Unable to load gym.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (gymId) {
      void loadGym();
    }

    return () => {
      active = false;
    };
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
    <section className="space-y-6">
      <PageHeader
        title="Gym detail"
        subtitle={gym?.name ?? "Review and update this location profile."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/gyms" className="button secondary">Back</Link>
            <button type="button" className="button secondary" onClick={() => setShowDeleteConfirm(true)} disabled={!gym || deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading gym details...</p>
      ) : null}

      {!loading && !gym ? (
        <EmptyState title="Gym not found" description="This location may have been removed or you may no longer have access." action={<Link href="/platform/gyms" className="button secondary">Back to locations</Link>} />
      ) : null}

      {gym ? (
        <SectionCard title="Gym profile">
          <form className="space-y-4" onSubmit={handleSave}>
            <label className="grid gap-2 text-sm text-slate-300">
              Gym name
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>ID: {gym.id}</p>
              <p>Owner ID: {gym.ownerId}</p>
              <p>Created: {formatDate(gym.createdAt)}</p>
              <p>Updated: {formatDate(gym.updatedAt)}</p>
            </div>
            <button type="submit" className="button" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </SectionCard>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <SectionCard title="Delete gym?" className="w-full max-w-md">
            <p className="text-sm text-slate-300">Are you sure you want to permanently delete {gym?.name ?? "this gym"}?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="button ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
              <button type="button" className="button" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </section>
  );
}
