"use client";

import { useMemo, useState } from "react";
import DataTable, { type DataTableColumn } from "../../../src/components/DataTable";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { SectionCard } from "../../../src/components/common/SectionCard";
import { useToast } from "../../../src/components/toast/ToastProvider";
import { useAuth } from "../../../src/providers/AuthProvider";

const roles = ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH", "CLIENT"] as const;

export default function TeamPage() {
  const { memberships } = useAuth();
  const toast = useToast();
  const [inviteRole, setInviteRole] = useState<(typeof roles)[number]>("GYM_STAFF_COACH");
  const [inviteLocation, setInviteLocation] = useState("");

  const inviteLink = useMemo(
    () => `${typeof window === "undefined" ? "https://gymstack.club" : window.location.origin}/signup?intent=${inviteRole === "CLIENT" ? "client" : "staff"}&token=demo-${inviteRole.toLowerCase()}`,
    [inviteRole],
  );

  const inviteUrlWithLocation = `${inviteLink}${inviteLocation ? `&location=${encodeURIComponent(inviteLocation)}` : ""}`;

  const columns: DataTableColumn<(typeof memberships)[number]>[] = [
    { id: "workspace", header: "Workspace", cell: (membership) => membership.tenantId, sortable: true, sortValue: (membership) => membership.tenantId },
    { id: "role", header: "Role", cell: (membership) => membership.role, sortable: true, sortValue: (membership) => membership.role },
    { id: "status", header: "Status", cell: (membership) => <span className="badge success">{membership.status}</span>, sortable: true, sortValue: (membership) => membership.status },
  ];

  return (
    <section className="space-y-6">
      <PageHeader title="Staff & team" subtitle="Invite admins, coaches, and clients with clear role boundaries." />

      <SectionCard title="Invite user">
        <p className="text-sm text-muted-foreground">Generate a role-aware invite link and share it securely.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input className="input h-9 flex-1 truncate text-xs" readOnly value={inviteUrlWithLocation} aria-label="Invite link" />
          <button
            type="button"
            className="button secondary button-sm topbar-icon-button"
            aria-label="Copy invite link"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrlWithLocation);
              toast.success("Copied", "Invite link copied to clipboard.");
            }}
          >
            <span aria-hidden="true">⧉</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Team status">
        {memberships.length === 0 ? (
          <EmptyState title="No memberships yet" description="Invite staff or clients after creating your first location." />
        ) : (
          <DataTable rows={memberships} columns={columns} getRowKey={(row) => row.id} searchPlaceholder="Search memberships" pageSize={8} />
        )}
      </SectionCard>
    </section>
  );
}
