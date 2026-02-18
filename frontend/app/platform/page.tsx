"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageCard, PageContainer, PageGrid, PageHeader, PageSection } from "../../src/components/platform/page/primitives";
import { DataTable, EmptyState, ErrorState, LoadingState, StatCard, type DataTableColumn } from "../../src/components/platform/data";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";
import { ApiFetchError, apiFetch } from "../../src/lib/apiFetch";
import { WeeklyAiBriefCard } from "../../src/components/dashboard/WeeklyAiBrief";

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
        const [gymListResult, userListResult, dashboardResult] = await Promise.allSettled([
          listGyms(),
          listUsers(),
          apiFetch<DashboardSummary>("/api/org/dashboard-summary", { method: "GET" }),
        ]);
        if (!active) {
          return;
        }
        const gymList = gymListResult.status === "fulfilled" ? gymListResult.value : [];
        const userList = userListResult.status === "fulfilled" ? userListResult.value : [];
        const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;

        setGyms(gymList);
        setUsers(userList);
        setSummary(dashboard);

        const errors = [gymListResult, userListResult, dashboardResult]
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => result.reason)
          .filter((reason): reason is Error => reason instanceof Error);

        const hasNonPermissionError = errors.some((reason) => !(reason instanceof ApiFetchError && reason.statusCode === 403));
        if (hasNonPermissionError) {
          setError("Some dashboard data is temporarily unavailable.");
        }
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
        <WeeklyAiBriefCard />
      </PageSection>

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
