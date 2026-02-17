"use client";
import { useEffect, useMemo, useState } from "react";
import { DataTable, EmptyState, ErrorState, LoadingState, type DataTableColumn } from "../../../src/components/platform/data";
import { PageCard, PageContainer, PageHeader, PageSection } from "../../../src/components/platform/page/primitives";
import { apiFetch } from "../../../src/lib/apiFetch";

type ExportType = "members" | "bookings" | "attendance" | "full";
type ExportStatus = "pending" | "processing" | "ready" | "failed";
type ExportJob = { id: string; type: ExportType; status: ExportStatus; createdAt: string; expiresAt: string | null };
const EXPORT_OPTIONS: Array<{ label: string; type: ExportType }> = [
  { label: "Members", type: "members" },
  { label: "Bookings", type: "bookings" },
  { label: "Attendance", type: "attendance" },
  { label: "Full export", type: "full" },
];

export default function DataExportPage() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningType, setRunningType] = useState<ExportType | null>(null);

  const loadJobs = async () => {
    const response = await apiFetch<ExportJob[]>("/api/exports", { method: "GET", cache: "no-store" });
    setJobs(response);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try { await loadJobs(); } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load exports"); }
      finally { if (active) setLoading(false); }
    };
    void run();
    const interval = setInterval(() => { void loadJobs(); }, 4000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const requestExport = async (type: ExportType) => {
    try {
      setRunningType(type);
      setError(null);
      await apiFetch("/api/exports", { method: "POST", body: { type } });
      await loadJobs();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to queue export job");
    } finally { setRunningType(null); }
  };

  const openDownload = async (id: string) => {
    const response = await apiFetch<{ url: string }>(`/api/exports/${id}/download`, { method: "GET" });
    window.open(response.url, "_blank", "noopener,noreferrer");
  };

  const columns = useMemo<DataTableColumn<ExportJob>[]>(() => [
    { id: "type", header: "Export type", cell: (row) => row.type },
    { id: "status", header: "Status", cell: (row) => row.status },
    { id: "createdAt", header: "Created", cell: (row) => new Date(row.createdAt).toLocaleString(), sortable: true, sortValue: (row) => row.createdAt },
    { id: "download", header: "Download", cell: (row) => row.status === "ready" ? <button className="button secondary" onClick={() => void openDownload(row.id)} type="button">Download</button> : <span className="text-xs text-slate-400">Unavailable</span> },
  ], []);

  return <PageContainer>
    <PageHeader title="Data export" description="Request async exports for tenant-owned data." />
    <PageSection><PageCard title="Create export"><div className="flex flex-wrap gap-2">{EXPORT_OPTIONS.map((option) => (
      <button key={option.type} className="button" type="button" disabled={runningType === option.type} onClick={() => void requestExport(option.type)}>{runningType === option.type ? "Queuing..." : option.label}</button>
    ))}</div></PageCard></PageSection>
    <PageSection><PageCard title="Export history">{error ? <ErrorState message={error} /> : null}{loading ? <LoadingState message="Loading export jobs..." /> : null}
      {!loading ? <DataTable rows={jobs} columns={columns} getRowKey={(row) => row.id} emptyState={<EmptyState title="No exports yet" description="Run your first export to create a downloadable CSV." />} /> : null}
    </PageCard></PageSection>
  </PageContainer>;
}
