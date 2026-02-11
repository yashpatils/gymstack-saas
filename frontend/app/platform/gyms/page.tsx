"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
} from "../../components/ui";
import DataTable, { DataTableColumn } from "../../../src/components/DataTable";
import {
  Gym,
  createGym,
  deleteGym,
  listGyms,
  updateGym,
} from "../../../src/lib/gyms";

export default function GymsPage() {
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
      await loadGyms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create gym.");
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
      await loadGyms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update gym.");
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
      await loadGyms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete gym.");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: DataTableColumn<Gym>[] = [
    {
      id: "gym",
      header: "Gym",
      sortable: true,
      sortValue: (gym) => gym.name,
      searchValue: (gym) => `${gym.name} ${gym.id}`,
      cell: (gym) => {
        const isEditing = editingId === gym.id;

        return (
          <div>
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
          </div>
        );
      },
    },
    {
      id: "ownerId",
      header: "Owner",
      sortable: true,
      sortValue: (gym) => gym.ownerId,
      searchValue: (gym) => gym.ownerId,
      cell: (gym) => gym.ownerId,
    },
    {
      id: "updatedAt",
      header: "Updated",
      sortable: true,
      sortValue: (gym) => gym.updatedAt ?? "",
      searchValue: (gym) => (gym.updatedAt ? new Date(gym.updatedAt).toLocaleString() : ""),
      cell: (gym) => (gym.updatedAt ? new Date(gym.updatedAt).toLocaleString() : "-"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (gym) => {
        const isEditing = editingId === gym.id;
        const isDeleting = deletingId === gym.id;

        return (
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button onClick={() => handleSaveEdit(gym.id)} disabled={savingEdit}>
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
          </div>
        );
      },
    },
  ];

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

      <DataTable
        rows={gyms}
        columns={columns}
        getRowKey={(gym) => gym.id}
        loading={loading}
        searchPlaceholder="Search gyms..."
        emptyState={
          <EmptyState
            title="No gyms found"
            description="Create your first gym to get started."
          />
        }
      />
    </PageShell>
  );
}
