"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, EmptyState, ErrorState, LoadingState, type DataTableColumn } from "../../../src/components/platform/data";
import { FormActions, FormDialog } from "../../../src/components/platform/form";
import { PageCard, PageContainer, PageHeader } from "../../../src/components/platform/page/primitives";
import { useToast } from "../../../src/components/toast/ToastProvider";
import { listTenantMembers, type TenantMember, updateTenantMember } from "../../../src/lib/tenant";

type RemoveState = {
  member: TenantMember;
  submitting: boolean;
  error: string | null;
};

export default function TeamPage() {
  const toast = useToast();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeState, setRemoveState] = useState<RemoveState | null>(null);
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextMembers = await listTenantMembers();
      setMembers(nextMembers);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load team members.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadMembers(); }, []);

  const columns: DataTableColumn<TenantMember>[] = useMemo(() => [
    { id: "email", header: "Member", cell: (m) => m.email, sortable: true, sortValue: (m) => m.email },
    { id: "role", header: "Role", cell: (m) => m.role, sortable: true, sortValue: (m) => m.role },
    { id: "location", header: "Location", cell: (m) => m.locationName ?? "Tenant-wide", sortable: true, sortValue: (m) => m.locationName ?? "" },
    { id: "status", header: "Status", cell: (m) => m.status, sortable: true, sortValue: (m) => m.status },
    {
      id: "actions",
      header: "",
      cell: (m) => (
        <button
          className="button secondary button-sm"
          disabled={rowLoadingId === m.id}
          onClick={() => setRemoveState({ member: m, submitting: false, error: null })}
        >
          {rowLoadingId === m.id ? "Removing..." : "Remove"}
        </button>
      ),
    },
  ], [rowLoadingId]);

  const handleRemove = async () => {
    if (!removeState) {
      return;
    }

    const member = removeState.member;
    setRemoveState((current) => current ? { ...current, submitting: true, error: null } : current);
    setRowLoadingId(member.id);
    try {
      await updateTenantMember(member.id, { remove: true });
      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setRemoveState(null);
      toast.success("Member removed", "Membership was removed.");
    } catch (removeError: unknown) {
      const message = removeError instanceof Error ? removeError.message : "Unable to remove member.";
      setRemoveState((current) => current ? { ...current, submitting: false, error: message } : current);
      await loadMembers();
    } finally {
      setRowLoadingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Team" description="Members across locations with role and scope controls." />
      <PageCard title="Members">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading team members..." /> : null}
        {!loading && members.length === 0 ? <EmptyState title="No members yet" description="Invite managers, staff, or clients to populate your tenant team." /> : null}
        {!loading && members.length > 0 ? <DataTable rows={members} columns={columns} getRowKey={(row) => row.id} searchPlaceholder="Search by email or role" pageSize={10} /> : null}
      </PageCard>

      {removeState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <FormDialog
              title="Remove member"
              actions={(
                <FormActions>
                  <button type="button" className="button secondary" disabled={removeState.submitting} onClick={() => setRemoveState(null)}>
                    Cancel
                  </button>
                  <button type="button" className="button" disabled={removeState.submitting} onClick={() => void handleRemove()}>
                    {removeState.submitting ? "Removing..." : "Confirm remove"}
                  </button>
                </FormActions>
              )}
            >
              <p className="text-sm text-muted-foreground">Remove <strong className="text-foreground">{removeState.member.email}</strong> from this tenant?</p>
              {removeState.error ? <ErrorState message={removeState.error} /> : null}
            </FormDialog>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
