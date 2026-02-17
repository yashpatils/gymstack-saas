"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageCard, PageContainer, PageGrid, PageHeader, PageSection } from "../../src/components/platform/page/primitives";
import { DataTable, EmptyState, ErrorState, LoadingState, StatCard, type DataTableColumn } from "../../src/components/platform/data";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";
import { apiFetch } from "../../src/lib/apiFetch";

type DashboardSummary = {
  locations: number;
  members: number;
  mrr: number | null;
  invites: number;
};

export default function PlatformPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [gymList, userList, dashboard] = await Promise.all([
          listGyms(),
          listUsers(),
          apiFetch<DashboardSummary>("/api/org/dashboard-summary", { method: "GET" }),
        ]);
        if (!active) {
          return;
        }
        setGyms(gymList);
        setUsers(userList);
        setSummary(dashboard);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const columns: DataTableColumn<Gym>[] = [
    { id: "name", header: "Location", cell: (row) => row.name, sortable: true, sortValue: (row) => row.name },
    { id: "domain", header: "Domain", cell: (row) => `${row.id.slice(0, 8)}.gymstack.club` },
    { id: "open", header: "", cell: (row) => <Link href={`/platform/gyms/${row.id}`} className="button secondary">Open</Link> },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Unified workspace snapshot for operations, billing, and locations."
        actions={<Link href="/platform/gyms/new" className="button">Create gym</Link>}
      />

      <PageGrid columns={4}>
        <StatCard label="Locations" value={String(summary?.locations ?? gyms.length)} />
        <StatCard label="Members" value={String(summary?.members ?? users.length)} />
        <StatCard label="MRR" value={summary?.mrr ? `$${summary.mrr.toFixed(2)}` : "—"} />
        <StatCard label="Invites" value={String(summary?.invites ?? 0)} />
      </PageGrid>

      <PageSection>
        <PageCard title="Locations">
          {error ? <ErrorState message={error} /> : null}
          {loading ? <LoadingState message="Loading dashboard data..." /> : null}
          {!loading ? (
            <DataTable
              rows={gyms}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={6}
              emptyState={<EmptyState title="No locations yet" description="Create a location to start inviting your team." />}
            />
          ) : null}
        </PageCard>
      </PageSection>
    </PageContainer>
  );
}
