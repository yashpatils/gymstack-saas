"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataTableColumn } from "../../../src/components/DataTable";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { SectionCard } from "../../../src/components/common/SectionCard";
import { useToast } from "../../../src/components/toast/ToastProvider";
import { listTenantMembers, type TenantMember, updateTenantMember } from "../../../src/lib/tenant";

export default function TeamPage() {
  const toast = useToast();
  const [members, setMembers] = useState<TenantMember[]>([]);

  useEffect(() => { void listTenantMembers().then(setMembers).catch(() => setMembers([])); }, []);

  const columns: DataTableColumn<TenantMember>[] = useMemo(() => [
    { id: "email", header: "Member", cell: (m) => m.email, sortable: true, sortValue: (m) => m.email },
    { id: "role", header: "Role", cell: (m) => m.role, sortable: true, sortValue: (m) => m.role },
    { id: "location", header: "Location", cell: (m) => m.locationName ?? "Tenant-wide", sortable: true, sortValue: (m) => m.locationName ?? "" },
    { id: "status", header: "Status", cell: (m) => m.status, sortable: true, sortValue: (m) => m.status },
    {
      id: "actions",
      header: "",
      cell: (m) => (
        <button className="button secondary button-sm" onClick={async () => {
          if (!confirm(`Remove ${m.email} from tenant?`)) return;
          await updateTenantMember(m.id, { remove: true });
          setMembers((prev) => prev.filter((row) => row.id !== m.id));
          toast.success("Member removed", "Membership was removed.");
        }}>Remove</button>
      ),
    },
  ], [toast]);

  return (
    <section className="space-y-6">
      <PageHeader title="Team" subtitle="Members across locations with role and scope controls." />
      <SectionCard title="Members">
        {members.length === 0 ? <EmptyState title="No members yet" description="Invite managers, staff, or clients to populate your tenant team." /> : (
          <DataTable rows={members} columns={columns} getRowKey={(row) => row.id} searchPlaceholder="Search by email or role" pageSize={10} />
        )}
      </SectionCard>
    </section>
  );
}
