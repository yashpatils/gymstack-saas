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
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAuditLogs(50);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const actions = useMemo(() => {
    const distinctActions = Array.from(new Set(logs.map((entry) => entry.action)));
    return distinctActions.sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (actionFilter === "all") {
      return logs;
    }

    return logs.filter((entry) => entry.action === actionFilter);
  }, [actionFilter, logs]);

  const columns: DataTableColumn<AuditLog>[] = [
    {
      id: "time",
      header: "Time",
      cell: (entry) => formatDate(entry.createdAt),
      sortable: true,
      sortValue: (entry) => entry.createdAt,
      searchValue: (entry) => formatDate(entry.createdAt),
    },
    {
      id: "user",
      header: "User",
      cell: (entry) => entry.user?.email ?? "System",
      sortable: true,
      sortValue: (entry) => entry.user?.email ?? "",
      searchValue: (entry) => entry.user?.email ?? "",
    },
    {
      id: "action",
      header: "Action",
      cell: (entry) => entry.action,
      sortable: true,
      sortValue: (entry) => entry.action,
      searchValue: (entry) => entry.action,
    },
    {
      id: "entity",
      header: "Entity",
      cell: (entry) => `${entry.entityType}${entry.entityId ? ` • ${entry.entityId}` : ""}`,
      sortable: true,
      sortValue: (entry) => `${entry.entityType}:${entry.entityId ?? ""}`,
      searchValue: (entry) => `${entry.entityType} ${entry.entityId ?? ""}`,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Audit Log"
        subtitle="Track important platform actions across auth, gyms, users, and billing."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Audit" },
        ]}
      />

      <div className="card space-y-3">
        <label className="text-sm text-slate-300" htmlFor="audit-action-filter">
          Filter by action
        </label>
        <select
          id="audit-action-filter"
          className="input"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
        >
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <DataTable
        rows={filteredLogs}
        columns={columns}
        getRowKey={(entry) => entry.id}
        loading={loading}
        searchPlaceholder="Search audit logs..."
        emptyState={
          <EmptyState
            title="No audit logs yet"
            description="Important activity will appear here once actions are performed."
          />
        }
      />
    </PageShell>
  );
}
