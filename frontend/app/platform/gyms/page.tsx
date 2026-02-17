"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable, EmptyState, ErrorState, LoadingState, StatCard, type DataTableColumn } from "../../../src/components/platform/data";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { listGyms, type Gym } from "../../../src/lib/gyms";

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listGyms()
      .then((list) => {
        if (active) setGyms(list);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const columns: DataTableColumn<Gym>[] = [
    { id: "name", header: "Name", cell: (gym) => gym.name, sortable: true, sortValue: (gym) => gym.name },
    { id: "domain", header: "Domain", cell: (gym) => `${gym.id.slice(0, 8)}.gymstack.club` },
    { id: "timezone", header: "Timezone", cell: (gym) => gym.timezone ?? "UTC" },
    { id: "open", header: "", cell: (gym) => <Link href={`/platform/gyms/${gym.id}`} className="button secondary">Open</Link> },
  ];

  const newest = useMemo(() => gyms[0]?.name ?? "No locations", [gyms]);

  return (
    <PageContainer>
      <PageHeader title="Gyms / Locations" description="Manage location profiles, domains, and operations." actions={<Link href="/platform/gyms/new" className="button">Create location</Link>} />
      <PageGrid columns={3}>
        <StatCard label="Total" value={String(gyms.length)} />
        <StatCard label="Newest" value={newest} />
        <StatCard label="Domains" value={gyms.length ? "Configured" : "—"} />
      </PageGrid>
      <PageCard title="Location directory">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading locations..." /> : null}
        {!loading ? <DataTable rows={gyms} columns={columns} getRowKey={(row) => row.id} pageSize={8} emptyState={<EmptyState title="No locations yet" description="Create your first location to get started." action={<Link href="/platform/gyms/new" className="button">Create location</Link>} />} /> : null}
      </PageCard>
    </PageContainer>
  );
}
