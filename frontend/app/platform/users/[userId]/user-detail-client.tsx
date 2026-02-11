"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  PageHeader,
  PageShell,
} from "../../../components/ui";
import { useSession } from "../../../components/session-provider";
import { User, deleteUser, getUser } from "../../../../src/lib/users";

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

export default function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter();
  const session = useSession();
  const canDelete = session.platformRole === "platform_admin";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUser(userId);
      setUser(data);
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

  const handleDelete = async () => {
    if (!canDelete) {
      setError("You must be a platform admin to delete users.");
      return;
    }

    if (!window.confirm("Delete this user?")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteUser(userId);
      router.push("/platform/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user.");
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="User details"
        subtitle={user?.email ?? "Review this user account."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push("/platform/users")}>Back</Button>
            <Button
              variant="outline"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading user details...</p>
      ) : user ? (
        <Card title="Profile">
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-400">ID:</span> {user.id}
            </p>
            <p>
              <span className="text-slate-400">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-slate-400">Role:</span> {user.role ?? "-"}
            </p>
            <p>
              <span className="text-slate-400">Created:</span> {formatDate(user.createdAt)}
            </p>
            <p>
              <span className="text-slate-400">Updated:</span> {formatDate(user.updatedAt)}
            </p>
          </div>
        </Card>
      ) : (
        <p className="text-sm text-slate-400">User not found.</p>
      )}
    </PageShell>
  );
}
