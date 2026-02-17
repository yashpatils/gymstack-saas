"use client";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageShell } from "../../components/ui";
import DataTable, { DataTableColumn } from "../../../src/components/DataTable";
import PageHeader from "../../../src/components/PageHeader";
import { AuditLog, listAuditLogs } from "../../../src/lib/audit";

export default function SecurityPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => { void listAuditLogs({ limit: 100, action: action || undefined, actor: actor || undefined, from: from || undefined, to: to || undefined }).then((res) => setRows(res.items)); }, [action, actor, from, to]);

  const columns = useMemo<DataTableColumn<AuditLog>[]>(() => [
    { id: 'time', header: 'Time', cell: (r) => new Date(r.createdAt).toLocaleString() },
    { id: 'actor', header: 'Actor', cell: (r) => r.actorEmail ?? r.actorUser?.email ?? r.actorType ?? 'System' },
    { id: 'action', header: 'Action', cell: (r) => r.action },
    { id: 'target', header: 'Target', cell: (r) => `${r.targetType ?? '-'} ${r.targetId ?? ''}` },
    { id: 'ip', header: 'Location/IP', cell: (r) => r.ipAddress ?? '—' },
  ], []);

  return <PageShell>
    <PageHeader title="Security Center" subtitle="Tenant-scoped audit activity" breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Security' }]} />
    <div className="card grid gap-3 md:grid-cols-4">
      <input className="input" placeholder="Action" value={action} onChange={(e)=>setAction(e.target.value)} />
      <input className="input" placeholder="User" value={actor} onChange={(e)=>setActor(e.target.value)} />
      <input className="input" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
      <input className="input" type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
    </div>
    <DataTable rows={rows} columns={columns} getRowKey={(r)=>r.id} emptyState={<EmptyState title="No activity" description="Security events will appear here." />} />
  </PageShell>;
}
