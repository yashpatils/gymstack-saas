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
  const [action, setAction] = useState<string>("");
  const [actor, setActor] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAuditLogs({ limit: 100, action: action || undefined, actor: actor || undefined });
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [action, actor]);

  const actions = useMemo(() => Array.from(new Set(logs.map((entry) => entry.action))).sort(), [logs]);

  const columns = useMemo<DataTableColumn<AuditLog>[]>(() => [
    { id: "time", header: "Time", cell: (entry) => formatDate(entry.createdAt), sortable: true, sortValue: (entry) => entry.createdAt },
    { id: "actor", header: "Actor", cell: (entry) => entry.actorUser?.email ?? entry.actorType ?? "System", sortable: true, sortValue: (entry) => entry.actorUser?.email ?? entry.actorType ?? "" },
    { id: "action", header: "Action", cell: (entry) => entry.action, sortable: true, sortValue: (entry) => entry.action },
    { id: "target", header: "Target", cell: (entry) => `${entry.targetType ?? "-"}${entry.targetId ? ` • ${entry.targetId}` : ""}` },
  ], []);

  return (
    <PageShell>
      <PageHeader title="Audit Log" subtitle="Immutable activity trail for your tenant." breadcrumbs={[{ label: "Platform", href: "/platform" }, { label: "Audit" }]} />

      <div className="card grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm text-slate-300" htmlFor="audit-action-filter">Filter by action</label>
          <select id="audit-action-filter" className="input" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">All actions</option>
            {actions.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-300" htmlFor="audit-actor-filter">Actor email</label>
          <input id="audit-actor-filter" className="input" placeholder="owner@gym.com" value={actor} onChange={(event) => setActor(event.target.value)} />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <DataTable
        rows={logs}
        columns={columns}
        getRowKey={(entry) => entry.id}
        loading={loading}
        searchPlaceholder="Search audit logs..."
        emptyState={<EmptyState title="No audit logs yet" description="Important activity will appear here once actions are performed." />}
      />
    </PageShell>
  );
}
