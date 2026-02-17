"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiFetchError } from "../../../../src/lib/apiFetch";
import { StatCard } from "../../../../src/components/common/StatCard";
import { EmptyState } from "../../../../src/components/common/EmptyState";
import { useAuth } from "../../../../src/providers/AuthProvider";

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
    return <main className="container-app py-8"><p className="text-sm text-slate-300">Loading analytics…</p></main>;
  }

  if (!allowed) {
    return <main className="container-app py-8"><EmptyState title="Access restricted" description="Analytics are available to tenant owners and managers only." /></main>;
  }

  return <>{children}</>;
}

function ErrorBlock({ message, requestId }: { message: string; requestId?: string }) {
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{message} <span className="text-rose-300/90">Request ID: {requestId ?? "not available"}</span></div>;
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
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="section-title">Tenant Analytics</h1>
            <div className="flex gap-2">
              <button className={`button ${range === "7d" ? "" : "secondary"}`} onClick={() => setRange("7d")} type="button">7d</button>
              <button className={`button ${range === "30d" ? "" : "secondary"}`} onClick={() => setRange("30d")} type="button">30d</button>
            </div>
          </div>
          {error ? <ErrorBlock message={error} requestId={requestId} /> : null}
          {overview ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="MRR" value={`$${(overview.mrrCents / 100).toFixed(2)}`} />
              <StatCard label="Active members" value={String(overview.activeMemberships)} hint={`+${overview.newMemberships} new / ${overview.canceledMemberships} canceled`} />
              <StatCard label="Bookings" value={String(overview.bookings)} hint={`${overview.cancellations} canceled`} />
              <StatCard label="Check-ins" value={String(overview.checkins)} hint={`${overview.uniqueActiveClients} unique clients`} />
            </div>
          ) : null}
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Trend ({metric})</h2>
            <select className="input max-w-56" value={metric} onChange={(event) => setMetric(event.target.value as TrendMetric)}>
              <option value="bookings">Bookings</option>
              <option value="checkins">Check-ins</option>
              <option value="memberships">Memberships</option>
            </select>
          </div>
          {trends.length === 0 ? <EmptyState title="No sessions yet" description="Create sessions and bookings to populate trend analytics." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-400"><th className="py-2">Date</th><th className="py-2">Value</th><th className="py-2">Signal</th></tr></thead>
                <tbody>
                  {trends.map((point) => (
                    <tr key={point.date} className="border-t border-white/10">
                      <td className="py-2">{point.date}</td>
                      <td className="py-2">{point.value}</td>
                      <td className="py-2"><div className="h-2 rounded bg-indigo-500/30" style={{ width: `${Math.max((point.value / trendMax) * 100, 2)}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card flex flex-wrap gap-3">
          <Link className="button secondary" href="/platform/analytics/locations">View locations breakdown</Link>
          <Link className="button secondary" href="/platform/analytics/classes">View top classes</Link>
        </section>
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
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="section-title">Location analytics</h1>
            <div className="flex gap-2">
              <button className={`button ${range === "7d" ? "" : "secondary"}`} onClick={() => setRange("7d")} type="button">7d</button>
              <button className={`button ${range === "30d" ? "" : "secondary"}`} onClick={() => setRange("30d")} type="button">30d</button>
            </div>
          </div>
          {rows.length === 0 ? <EmptyState title="No bookings yet" description="Location metrics will appear after classes start receiving bookings." /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400"><th className="py-2">Location</th><th>Bookings</th><th>Check-ins</th><th>Active memberships</th><th>Utilization</th></tr></thead>
              <tbody>{rows.map((row) => <tr className="border-t border-white/10" key={row.locationId}><td className="py-2">{row.name}</td><td>{row.bookings}</td><td>{row.checkins}</td><td>{row.activeMemberships}</td><td><span className="rounded-full bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200">{row.utilizationPct}%</span></td></tr>)}</tbody>
            </table>
          )}
        </section>
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
        <section className="card space-y-4">
          <h1 className="section-title">Top classes (30d)</h1>
          {rows.length === 0 ? <EmptyState title="No sessions yet" description="Create classes and sessions to see utilization and ranking." /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400"><th className="py-2">Class</th><th>Sessions</th><th>Bookings</th><th>Avg utilization</th></tr></thead>
              <tbody>{rows.map((row) => <tr className="border-t border-white/10" key={row.classId}><td className="py-2">{row.title}</td><td>{row.sessionsCount}</td><td>{row.bookingsCount}</td><td><span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">{row.avgUtilizationPct}%</span></td></tr>)}</tbody>
            </table>
          )}
        </section>
      </main>
    </RoleGuard>
  );
}
