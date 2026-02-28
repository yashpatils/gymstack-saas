"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable, EmptyState, ErrorState, LoadingState, StatCard, type DataTableColumn } from "../../../src/components/platform/data";
import { PageCard, PageContainer, PageGrid, PageHeader } from "../../../src/components/platform/page/primitives";
import { listGyms, type Gym } from "../../../src/lib/gyms";

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "gymstack.club";

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

  const getPublicLocationHref = (gym: Gym): string => {
    if (gym.customDomain && gym.domainVerifiedAt) {
      return `https://${gym.customDomain}`;
    }

    return `https://${gym.slug}.${baseDomain}`;
  };

  const columns: DataTableColumn<Gym>[] = [
    { id: "name", header: "Name", cell: (gym) => gym.name, sortable: true, sortValue: (gym) => gym.name },
    {
      id: "domain",
      header: "Domain",
      cell: (gym) => {
        if (gym.customDomain && gym.domainVerifiedAt) {
          return gym.customDomain;
        }
        return `${gym.slug}.${baseDomain}`;
      },
    },
    { id: "timezone", header: "Timezone", cell: (gym) => gym.timezone ?? "UTC" },
    {
      id: "open",
      header: "",
      cell: (gym) => (
        <div className="flex justify-end gap-2">
          <a href={getPublicLocationHref(gym)} target="_blank" rel="noreferrer" className="button secondary">
            Open public site
          </a>
          <Link href={`/platform/gyms/${gym.id}`} className="button secondary">
            Manage location
          </Link>
        </div>
      ),
    },
  ];

  const newest = useMemo(() => {
    if (gyms.length === 0) {
      return "No locations";
    }

    const sorted = [...gyms].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });

    return sorted[0]?.name ?? "No locations";
  }, [gyms]);

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
