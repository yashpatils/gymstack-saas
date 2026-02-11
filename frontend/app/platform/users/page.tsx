"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  PageShell,
} from "../../components/ui";
import DataTable, { DataTableColumn } from "../../../src/components/DataTable";
import PageHeader from "../../../src/components/PageHeader";
import { useSession } from "../../components/session-provider";
import {
  User,
  deleteUser,
  listUsers,
  updateUser,
} from "../../../src/lib/users";

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default function UsersPage() {
  const router = useRouter();
  const session = useSession();
  const canDelete = session.platformRole === "platform_admin";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
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
      setError("You must be a platform admin to delete users.");
      return;
    }

    if (!window.confirm("Delete this user?")) {
      return;
    }

    setSavingUserId(userId);
    setError(null);
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user.");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEditRole = async (user: User) => {
    const nextRole = window.prompt("Set role", user.role ?? "");

    if (nextRole === null || nextRole === (user.role ?? "")) {
      return;
    }

    setSavingUserId(user.id);
    setError(null);
    try {
      await updateUser(user.id, { role: nextRole.trim() || undefined });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    } finally {
      setSavingUserId(null);
    }
  };

  const columns: DataTableColumn<User>[] = [
    {
      id: "email",
      header: "Email",
      cell: (user) => user.email,
      sortable: true,
      sortValue: (user) => user.email,
      searchValue: (user) => user.email,
    },
    {
      id: "role",
      header: "Role",
      cell: (user) => user.role ?? "-",
      sortable: true,
      sortValue: (user) => user.role ?? "",
      searchValue: (user) => user.role ?? "",
    },
    {
      id: "createdAt",
      header: "Created",
      cell: (user) => formatDate(user.createdAt),
      sortable: true,
      sortValue: (user) => user.createdAt ?? "",
      searchValue: (user) => formatDate(user.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (user) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push(`/platform/users/${user.id}`)}>
            View
          </Button>
          <Button
            variant="secondary"
            disabled={savingUserId === user.id}
            onClick={() => handleEditRole(user)}
          >
            Edit role
          </Button>
          <Button
            variant="outline"
            disabled={!canDelete || savingUserId === user.id}
            onClick={() => handleDelete(user.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle="Manage users across the platform."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Users" },
        ]}
        actions={<Button onClick={loadUsers}>Refresh</Button>}
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <DataTable
        rows={users}
        columns={columns}
        getRowKey={(user) => user.id}
        loading={loading}
        searchPlaceholder="Search users..."
        emptyState={
          <EmptyState
            title="No users found"
            description="Users will appear here once accounts are created."
            actions={<Button onClick={loadUsers}>Reload</Button>}
          />
        }
      />
    </PageShell>
  );
}
