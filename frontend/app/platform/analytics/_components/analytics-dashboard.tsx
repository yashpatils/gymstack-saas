"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiFetchError } from "../../../../src/lib/apiFetch";
import { StatCard } from "../../../../src/components/common/StatCard";
import { EmptyState } from "../../../../src/components/common/EmptyState";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { PageCard, PageCardContent, PageCardHeader } from "../../../../src/components/ui/page-card";

type Range = "7d" | "30d";
type TrendMetric = "bookings" | "checkins" | "memberships";

type Overview = {
  mrrCents: number;
  activeMemberships: number;
  newMemberships: number;
  canceledMemberships: number;
  bookings: number;
  cancellations: number;
  checkins: number;
  uniqueActiveClients: number;
};

type TrendPoint = { date: string; value: number };
type LocationRow = { locationId: string; name: string; bookings: number; checkins: number; activeMemberships: number; utilizationPct: number };
type ClassRow = { classId: string; title: string; sessionsCount: number; bookingsCount: number; avgUtilizationPct: number };

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { activeContext, loading } = useAuth();
  const allowed = activeContext?.role === "TENANT_OWNER" || activeContext?.role === "TENANT_LOCATION_ADMIN";

  if (loading) {
    return <main className="container-app py-8"><p className="text-sm text-muted-foreground">Loading analytics…</p></main>;
  }

  if (!allowed) {
    return <main className="container-app py-8"><EmptyState title="Access restricted" description="Analytics are available to tenant owners and managers only." /></main>;
  }

  return <>{children}</>;
}

function ErrorBlock({ message, requestId }: { message: string; requestId?: string }) {
  return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{message} <span className="text-destructive/80">Request ID: {requestId ?? "not available"}</span></div>;
}

export function AnalyticsOverviewView() {
  const [range, setRange] = useState<Range>("7d");
  const [metric, setMetric] = useState<TrendMetric>("bookings");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [overviewData, trendData] = await Promise.all([
          apiFetch<Overview>(`/api/analytics/overview?range=${range}`),
          apiFetch<TrendPoint[]>(`/api/analytics/trends?metric=${metric}&range=30d`),
        ]);
        if (!mounted) return;
        setOverview(overviewData);
        setTrends(trendData);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof ApiFetchError) {
          setError(err.message);
          setRequestId(err.requestId);
          return;
        }
        setError("Unable to load analytics");
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [range, metric]);

  const trendMax = useMemo(() => Math.max(...trends.map((point) => point.value), 1), [trends]);

  return (
    <RoleGuard>
      <main className="container-app space-y-6 py-8">
        <PageCard>
          <PageCardHeader
            title="Tenant Analytics"
            action={<div className="flex gap-2"><button className={`button ${range === "7d" ? "" : "secondary"}`} onClick={() => setRange("7d")} type="button">7d</button><button className={`button ${range === "30d" ? "" : "secondary"}`} onClick={() => setRange("30d")} type="button">30d</button></div>}
          />
          <PageCardContent>
            {error ? <ErrorBlock message={error} requestId={requestId} /> : null}
            {overview ? <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><StatCard label="MRR" value={`$${(overview.mrrCents / 100).toFixed(2)}`} /><StatCard label="Active members" value={String(overview.activeMemberships)} hint={`+${overview.newMemberships} new / ${overview.canceledMemberships} canceled`} /><StatCard label="Bookings" value={String(overview.bookings)} hint={`${overview.cancellations} canceled`} /><StatCard label="Check-ins" value={String(overview.checkins)} hint={`${overview.uniqueActiveClients} unique clients`} /></div> : null}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader
            title={`Trend (${metric})`}
            action={<select className="input max-w-56" value={metric} onChange={(event) => setMetric(event.target.value as TrendMetric)}><option value="bookings">Bookings</option><option value="checkins">Check-ins</option><option value="memberships">Memberships</option></select>}
          />
          <PageCardContent>
            {trends.length === 0 ? <EmptyState title="No sessions yet" description="Create sessions and bookings to populate trend analytics." /> : (
              <div className="overflow-x-auto rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground"><tr className="text-left"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Signal</th></tr></thead>
                  <tbody>
                    {trends.map((point) => (
                      <tr key={point.date} className="border-t border-border hover:bg-accent/30"><td className="px-4 py-3">{point.date}</td><td className="px-4 py-3">{point.value}</td><td className="px-4 py-3"><div className="h-2 rounded bg-primary/30" style={{ width: `${Math.max((point.value / trendMax) * 100, 2)}%` }} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent className="pt-5"><div className="flex flex-wrap gap-3"><Link className="button secondary" href="/platform/analytics/locations">View locations breakdown</Link><Link className="button secondary" href="/platform/analytics/classes">View top classes</Link></div></PageCardContent>
        </PageCard>
      </main>
    </RoleGuard>
  );
}

export function AnalyticsLocationsView() {
  const [range, setRange] = useState<Range>("30d");
  const [rows, setRows] = useState<LocationRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await apiFetch<{ items: LocationRow[] }>(`/api/analytics/locations?range=${range}&page=1&pageSize=50`);
      if (mounted) setRows(response.items);
    };
    void load();
    return () => { mounted = false; };
  }, [range]);

  return (
    <RoleGuard>
      <main className="container-app space-y-6 py-8">
        <PageCard>
          <PageCardHeader title="Location analytics" action={<div className="flex gap-2"><button className={`button ${range === "7d" ? "" : "secondary"}`} onClick={() => setRange("7d")} type="button">7d</button><button className={`button ${range === "30d" ? "" : "secondary"}`} onClick={() => setRange("30d")} type="button">30d</button></div>} />
          <PageCardContent>
            {rows.length === 0 ? <EmptyState title="No bookings yet" description="Location metrics will appear after classes start receiving bookings." /> : <div className="overflow-x-auto rounded-xl border border-border overflow-hidden"><table className="w-full text-sm"><thead className="bg-muted/40 text-muted-foreground"><tr className="text-left"><th className="px-4 py-3">Location</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Check-ins</th><th className="px-4 py-3">Active memberships</th><th className="px-4 py-3">Utilization</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t border-border hover:bg-accent/30" key={row.locationId}><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.bookings}</td><td className="px-4 py-3">{row.checkins}</td><td className="px-4 py-3">{row.activeMemberships}</td><td className="px-4 py-3"><span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground">{row.utilizationPct}%</span></td></tr>)}</tbody></table></div>}
          </PageCardContent>
        </PageCard>
      </main>
    </RoleGuard>
  );
}

export function AnalyticsClassesView() {
  const [rows, setRows] = useState<ClassRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await apiFetch<{ items: ClassRow[] }>("/api/analytics/top-classes?range=30d&page=1&pageSize=25");
      if (mounted) setRows(response.items);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <RoleGuard>
      <main className="container-app space-y-6 py-8">
        <PageCard>
          <PageCardHeader title="Top classes (30d)" />
          <PageCardContent>
            {rows.length === 0 ? <EmptyState title="No sessions yet" description="Create classes and sessions to see utilization and ranking." /> : <div className="overflow-x-auto rounded-xl border border-border overflow-hidden"><table className="w-full text-sm"><thead className="bg-muted/40 text-muted-foreground"><tr className="text-left"><th className="px-4 py-3">Class</th><th className="px-4 py-3">Sessions</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Avg utilization</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t border-border hover:bg-accent/30" key={row.classId}><td className="px-4 py-3">{row.title}</td><td className="px-4 py-3">{row.sessionsCount}</td><td className="px-4 py-3">{row.bookingsCount}</td><td className="px-4 py-3"><span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground">{row.avgUtilizationPct}%</span></td></tr>)}</tbody></table></div>}
          </PageCardContent>
        </PageCard>
      </main>
    </RoleGuard>
  );
}
