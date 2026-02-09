"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  PageHeader,
  PageShell,
  Table,
} from "../../components/ui";
import { useSession } from "../../components/session-provider";
import { apiFetch } from "../../lib/api";

type Gym = {
  id: string;
  name: string;
  city?: string;
  status?: string;
  owner?: string;
};

export default function GymsPage() {
  const router = useRouter();
  const session = useSession();
  const canDelete =
    session.platformRole === "platform_admin" ||
    session.tenants.some((tenant) => tenant.role === "tenant_owner");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGyms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Gym[]>("/gyms");
      setGyms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gyms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGyms();
  }, []);

  const handleDelete = async (gymId: string) => {
    if (!canDelete) {
      setError("You must be an owner or admin to delete gyms.");
      return;
    }
    if (!window.confirm("Delete this gym?")) {
      return;
    }
    try {
      await apiFetch(`/gyms/${gymId}`, { method: "DELETE" });
      await loadGyms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete gym.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Gyms"
        subtitle="Track active gyms and operational status."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/platform/gyms/new")}
            >
              Create gym
            </Button>
            <Button onClick={loadGyms}>Refresh</Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading gyms...</p>
      ) : gyms.length ? (
        <Table
          headers={["Gym", "City", "Owner", "Status", "Actions"]}
          rows={gyms.map((gym) => [
            <div key={`name-${gym.id}`}>
              <div className="font-medium text-white">{gym.name}</div>
              <div className="text-xs text-slate-400">{gym.id}</div>
            </div>,
            gym.city ?? "-",
            gym.owner ?? "-",
            gym.status ?? "Active",
            <div key={`actions-${gym.id}`} className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/platform/gyms/${gym.id}/edit`)}
              >
                Edit
              </Button>
              {canDelete ? (
                <Button variant="outline" onClick={() => handleDelete(gym.id)}>
                  Delete
                </Button>
              ) : (
                <span className="text-xs text-slate-500">
                  Owner or admin only
                </span>
              )}
            </div>,
          ])}
        />
      ) : (
        <EmptyState
          title="No gyms found"
          description="Create a new gym to start tracking locations."
          actions={
            <Button onClick={() => router.push("/platform/gyms/new")}>
              Create gym
            </Button>
          }
        />
      )}
    </PageShell>
  );
}
