"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataTableColumn } from "../../../src/components/DataTable";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { SectionCard } from "../../../src/components/common/SectionCard";
import { StatCard } from "../../../src/components/common/StatCard";
import { listGyms, type Gym } from "../../../src/lib/gyms";

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const gymList = await listGyms();
        if (active) {
          setGyms(gymList);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
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

  const newest = useMemo(() => gyms[0]?.name ?? "No locations", [gyms]);

  const columns: DataTableColumn<Gym>[] = [
    { id: "name", header: "Name", cell: (gym) => gym.name, sortable: true, sortValue: (gym) => gym.name },
    { id: "slug", header: "Slug / Domain", cell: (gym) => `${gym.id.slice(0, 8)}.gymstack.club`, searchValue: (gym) => gym.id },
    { id: "timezone", header: "Timezone", cell: (gym) => gym.timezone || "UTC" },
    {
      id: "action",
      header: "",
      cell: (gym) => (
        <Link className="button secondary" href={`/platform/gyms/${gym.id}`}>
          Open
        </Link>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Gyms / Locations"
        subtitle="Manage location profiles, domains, and operational metadata in one place."
        actions={<Link href="/platform/gyms/new" className="button">Create location</Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total locations" value={String(gyms.length)} icon="🏢" hint="Across your organization" />
        <StatCard label="Newest" value={newest} icon="✨" hint="Latest added location" />
        <StatCard label="Domains" value={gyms.length ? "In progress" : "—"} icon="🌐" hint="Custom domains + slug routing" />
      </div>

      <SectionCard title="Location directory">
        {error ? <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading locations...</p> : null}
        {!loading ? (
          <DataTable
            rows={gyms}
            columns={columns}
            getRowKey={(row) => row.id}
            searchPlaceholder="Search locations"
            emptyState={<EmptyState title="No locations yet" description="Create your first location and then invite staff and clients." action={<Link href="/platform/gyms/new" className="button">Create location</Link>} />}
            pageSize={8}
          />
        ) : null}
      </SectionCard>
    </section>
  );
}
