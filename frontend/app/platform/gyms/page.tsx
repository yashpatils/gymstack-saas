"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "../../../src/components/common/PageHeader";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { listGyms, type Gym } from "../../../src/lib/gyms";

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const gymList = await listGyms();
        if (active) setGyms(gymList);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <PageHeader title="Locations" subtitle="Manage slugs/domains, staff, and member counts." actions={<Link href="/platform/gyms/new" className="button">Create location</Link>} />
      {error ? <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">Loading locations...</div> : null}
      {!loading && gyms.length === 0 ? <EmptyState title="No locations yet" description="Create your first location and then invite staff and clients." action={<Link href="/platform/gyms/new" className="button">Create location</Link>} /> : null}
      {!loading && gyms.length > 0 ? (
        <article className="overflow-hidden rounded-2xl border border-border bg-card/70">
          <table className="table">
            <thead><tr><th>Name</th><th>Slug/Domain</th><th>Members</th><th>Staff</th><th /></tr></thead>
            <tbody>
              {gyms.map((gym) => (
                <tr key={gym.id}>
                  <td>{gym.name}</td>
                  <td>{gym.id.slice(0, 8)}.gymstack.club</td>
                  <td>—</td>
                  <td>—</td>
                  <td><Link className="button secondary" href={`/platform/gyms/${gym.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ) : null}
    </section>
  );
}
