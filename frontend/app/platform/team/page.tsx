"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { useAuth } from "../../../src/providers/AuthProvider";

const roles = ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH", "CLIENT"] as const;

export default function TeamPage() {
  const { memberships } = useAuth();
  const [inviteRole, setInviteRole] = useState<(typeof roles)[number]>("GYM_STAFF_COACH");
  const [inviteLocation, setInviteLocation] = useState("");
  const [copied, setCopied] = useState(false);

  const inviteLink = useMemo(
    () => `${typeof window === "undefined" ? "https://gymstack.club" : window.location.origin}/signup?intent=${inviteRole === "CLIENT" ? "client" : "staff"}&token=demo-${inviteRole.toLowerCase()}`,
    [inviteRole],
  );

  return (
    <section className="space-y-6">
      <PageHeader title="Team" subtitle="Invite admins, coaches, and clients with clear role boundaries." />

      <article className="rounded-2xl border border-border bg-card/70 p-5">
        <h2 className="text-lg font-semibold text-foreground">Invite user</h2>
        <p className="mt-1 text-sm text-muted-foreground">Generate a role-aware invite link and share it securely.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Role
            <select className="input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as (typeof roles)[number])}>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Location
            <input className="input" value={inviteLocation} onChange={(event) => setInviteLocation(event.target.value)} placeholder="Main Downtown" />
          </label>
          <button type="button" className="button" onClick={async () => {
            await navigator.clipboard.writeText(`${inviteLink}${inviteLocation ? `&location=${encodeURIComponent(inviteLocation)}` : ""}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}>{copied ? "Copied" : "Copy invite link"}</button>
        </div>
      </article>

      {memberships.length === 0 ? (
        <EmptyState title="No memberships yet" description="Invite staff or clients after creating your first location." />
      ) : (
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-lg font-semibold">Team status</h2>
          <table className="table mt-3">
            <thead><tr><th>Workspace</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td>{membership.tenantId}</td>
                  <td>{membership.role}</td>
                  <td><span className="badge success">{membership.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}
