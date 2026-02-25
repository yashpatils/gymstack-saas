"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { DataTableColumn } from "@/src/components/DataTable";
import { AuditLog, listAuditLogs } from "@/src/lib/audit";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function OrganizationAuditPage() {
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
    <main className="mx-auto max-w-6xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Organization audit log</h1>
      <p className="text-sm text-slate-300">Owner/admin-only activity timeline for security and compliance.</p>
      <DataTable
        rows={logs}
        columns={columns}
        getRowKey={(entry) => entry.id}
        loading={loading}
        searchPlaceholder="Search audit logs..."
      />
    </main>
  );
}
