"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  Table,
} from "../../components/ui";
import {
  Gym,
  createGym,
  deleteGym,
  listGyms,
  updateGym,
} from "../../../src/lib/gyms";
import { useToast } from "../../../src/components/toast/ToastProvider";

export default function GymsPage() {
  const toast = useToast();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGymName, setNewGymName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGyms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listGyms();
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGymName.trim()) {
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createGym({ name: newGymName.trim() });
      setNewGymName("");
      toast.success("Gym created", "New gym added to the platform.");
      await loadGyms();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to create gym.";
      setError(errorMessage);
      toast.error("Create gym failed", errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (gym: Gym) => {
    setEditingId(gym.id);
    setEditingName(gym.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (gymId: string) => {
    if (!editingName.trim()) {
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      await updateGym(gymId, { name: editingName.trim() });
      cancelEdit();
      toast.success("Gym updated", "Gym details were saved.");
      await loadGyms();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to update gym.";
      setError(errorMessage);
      toast.error("Update gym failed", errorMessage);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (gymId: string) => {
    if (!window.confirm("Delete this gym?")) {
      return;
    }

    setDeletingId(gymId);
    setError(null);
    try {
      await deleteGym(gymId);
      toast.success("Gym deleted", "Gym was removed from the platform.");
      await loadGyms();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to delete gym.";
      setError(errorMessage);
      toast.error("Delete gym failed", errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Gyms"
        subtitle="Manage gym locations from one place."
        actions={<Button onClick={loadGyms}>Refresh</Button>}
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Card title="Create gym" description="Add a new gym by name.">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm text-slate-300">
            Gym name
            <input
              className="input"
              value={newGymName}
              onChange={(event) => setNewGymName(event.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-400">Loading gyms...</p>
      ) : gyms.length ? (
        <Table
          headers={["Gym", "Owner", "Updated", "Actions"]}
          rows={gyms.map((gym) => {
            const isEditing = editingId === gym.id;
            const isDeleting = deletingId === gym.id;

            return [
              <div key={`name-${gym.id}`}>
                {isEditing ? (
                  <input
                    className="input"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                ) : (
                  <div className="font-medium text-white">{gym.name}</div>
                )}
                <div className="text-xs text-slate-400">{gym.id}</div>
              </div>,
              gym.ownerId,
              gym.updatedAt ? new Date(gym.updatedAt).toLocaleString() : "-",
              <div key={`actions-${gym.id}`} className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={() => handleSaveEdit(gym.id)}
                      disabled={savingEdit}
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => startEdit(gym)}>
                    Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleDelete(gym.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>,
            ];
          })}
        />
      ) : (
        <EmptyState
          title="No gyms found"
          description="Create your first gym to get started."
        />
      )}
    </PageShell>
  );
}
