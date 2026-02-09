"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  PageHeader,
  PageShell,
} from "../../../components/ui";
import { apiFetch } from "../../../lib/api";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
  createdAt?: string;
  lastActiveAt?: string;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserDetail>(`/users/${userId}`);
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
    if (!window.confirm("Delete this user?")) {
      return;
    }
    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      router.push("/platform/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="User details"
        subtitle={user?.email ?? "Review user profile information."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/platform/users/${userId}/edit`)}
            >
              Edit user
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading user details...</p>
      ) : user ? (
        <div className="grid grid-2">
          <Card title="Profile">
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Name:</span> {user.name}
              </p>
              <p>
                <span className="text-slate-400">Email:</span> {user.email}
              </p>
              <p>
                <span className="text-slate-400">Role:</span>{" "}
                {user.role ?? "Not assigned"}
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{" "}
                {user.status ?? "Active"}
              </p>
            </div>
          </Card>
          <Card title="Activity">
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Created:</span>{" "}
                {user.createdAt ?? "Unknown"}
              </p>
              <p>
                <span className="text-slate-400">Last active:</span>{" "}
                {user.lastActiveAt ?? "Unknown"}
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-slate-400">User not found.</p>
      )}
    </PageShell>
  );
}
