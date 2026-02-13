"use client";

import { FormEvent, useEffect, useState } from "react";
import { listUsers, User } from "../../../src/lib/users";
import { createInvite } from "../../../src/lib/invites";
import { defaultFeatureFlags, getFeatureFlags } from "../../../src/lib/featureFlags";

export default function PlatformTeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN" | "OWNER">("USER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enableInvites, setEnableInvites] = useState(defaultFeatureFlags.enableInvites);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const flags = await getFeatureFlags();
        setEnableInvites(flags.enableInvites);
      } catch {
        setEnableInvites(defaultFeatureFlags.enableInvites);
      }

      await loadUsers();
    };

    void loadPageData();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!enableInvites) {
      setError("Team invites are disabled.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInviteLink(null);

    try {
      const result = await createInvite({ email, role });
      setInviteLink(result.inviteLink);
      setEmail("");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page space-y-6">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">Manage org members and create invite links.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">Invite member</h2>
        {!enableInvites ? (
          <p className="text-sm text-slate-300">
            Team invites are currently disabled by an owner in admin settings.
          </p>
        ) : null}
        <input
          required
          disabled={!enableInvites || submitting}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <select
          disabled={!enableInvites || submitting}
          value={role}
          onChange={(event) => setRole(event.target.value as "USER" | "ADMIN" | "OWNER")}
          className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="OWNER">OWNER</option>
        </select>
        <button
          type="submit"
          disabled={!enableInvites || submitting}
          className="rounded-md border border-white/20 px-3 py-2 text-sm disabled:opacity-60"
        >
          {!enableInvites ? "Invites disabled" : submitting ? "Sending..." : "Create invite"}
        </button>
      </form>

      {inviteLink ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Invite link: <span className="break-all">{inviteLink}</span>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3 rounded-md border border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">Members</h2>
        {loading ? (
          <p className="text-sm text-slate-300">Loading members...</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-200">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between rounded border border-white/10 p-2">
                <span>{user.email}</span>
                <span className="text-xs text-slate-400">{user.role ?? "USER"}</span>
              </li>
            ))}
            {!users.length ? <li className="text-slate-400">No members found.</li> : null}
          </ul>
        )}
      </div>
    </section>
  );
}
