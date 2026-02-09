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

type User = {
  id: string;
  email: string;
  role?: string;
  subscriptionStatus?: string;
};

export default function UsersPage() {
  const router = useRouter();
  const session = useSession();
  const canDelete = session.platformRole === "platform_admin";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<User[]>("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!canDelete) {
      setError("You must be an admin to delete users.");
      return;
    }
    if (!window.confirm("Delete this user?")) {
      return;
    }
    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle="Manage platform users and access roles."
        actions={<Button onClick={loadUsers}>Refresh</Button>}
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading users...</p>
      ) : users.length ? (
        <Table
          headers={["User", "Email", "Role", "Subscription", "Actions"]}
          rows={users.map((user) => [
            <div key={`name-${user.id}`}>
              <div className="font-medium text-white">{user.email}</div>
              <div className="text-xs text-slate-400">{user.id}</div>
            </div>,
            user.email,
            user.role ?? "-",
            user.subscriptionStatus ?? "Inactive",
            <div key={`actions-${user.id}`} className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push(`/platform/users/${user.id}`)}
              >
                View
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/platform/users/${user.id}/edit`)}
              >
                Edit
              </Button>
              {canDelete ? (
                <Button variant="outline" onClick={() => handleDelete(user.id)}>
                  Delete
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Admin only</span>
              )}
            </div>,
          ])}
        />
      ) : (
        <EmptyState
          title="No users found"
          description="Once users are created they will show up here."
          actions={<Button onClick={loadUsers}>Reload</Button>}
        />
      )}
    </PageShell>
  );
}
