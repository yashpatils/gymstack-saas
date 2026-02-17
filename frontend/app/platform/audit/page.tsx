"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageShell } from "../../components/ui";
import DataTable, { DataTableColumn } from "../../../src/components/DataTable";
import PageHeader from "../../../src/components/PageHeader";
import { AuditLog, listAuditLogs } from "../../../src/lib/audit";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await listAuditLogs({ limit: 100 });
      setLogs(Array.isArray(data.items) ? data.items : []);
      setLoading(false);
    };
    void load();
  }, []);

  const columns = useMemo<DataTableColumn<AuditLog>[]>(() => [
    { id: "time", header: "Time", cell: (entry) => formatDate(entry.createdAt), sortable: true, sortValue: (entry) => entry.createdAt },
    { id: "actor", header: "Actor", cell: (entry) => entry.actorEmail ?? entry.actorUser?.email ?? entry.actorType ?? "System" },
    { id: "action", header: "Action", cell: (entry) => entry.action },
    { id: "target", header: "Target", cell: (entry) => `${entry.targetType ?? "-"}${entry.targetId ? ` • ${entry.targetId}` : ""}` },
  ], []);

  return (
    <PageShell>
      <PageHeader title="Audit Log" subtitle="Immutable activity trail for your tenant." breadcrumbs={[{ label: "Platform", href: "/platform" }, { label: "Audit" }]} />
      <DataTable rows={logs} columns={columns} getRowKey={(entry) => entry.id} loading={loading} searchPlaceholder="Search audit logs..." emptyState={<EmptyState title="No audit logs yet" description="Important activity will appear here once actions are performed." />} />
    </PageShell>
  );
}
