"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WeeklyAiBriefCard } from "../../src/components/dashboard/WeeklyAiBrief";
import { EmptyState, ErrorState, LoadingState } from "../../src/components/platform/data";
import { ApiFetchError, apiFetch } from "../../src/lib/apiFetch";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { formatDashboardMetric, mapUsersToMemberRows, type DashboardMemberRow } from "../../src/lib/platformDashboard";
import { listUsers, type User } from "../../src/lib/users";

type DashboardSummary = {
  locations: number;
  members: number;
  mrr: number | null;
  invites: number;
};

type DailyMetricPoint = {
  date: string;
  bookings: number;
  checkins: number;
  uniqueClients: number;
  newClients: number;
  canceledBookings: number;
  activeMemberships: number;
  canceledMemberships: number;
  newMemberships: number;
};

type GymMetricsResponse = {
  gymId: string;
  from: string;
  to: string;
  kpis: {
    bookings: number;
    checkins: number;
    newClients: number;
    churnedMemberships: number;
    newMemberships: number;
    latestActiveMemberships: number;
  };
  daily: DailyMetricPoint[];
};

function shellCardClassName(extra?: string): string {
  return [
    "rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function DashboardStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className={shellCardClassName("p-4")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

function StatusPill({ status }: { status: DashboardMemberRow["status"] }) {
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function PlatformPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<GymMetricsResponse | null>(null);
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

        if (gymList.length > 0) {
          const toDate = new Date();
          const fromDate = new Date();
          fromDate.setDate(toDate.getDate() - 29);
          const from = fromDate.toISOString().slice(0, 10);
          const to = toDate.toISOString().slice(0, 10);

          try {
            const metricsResponse = await apiFetch<GymMetricsResponse>(`/api/gyms/${gymList[0].id}/metrics?from=${from}&to=${to}`, { method: "GET" });
            if (active) {
              setMetrics(metricsResponse);
            }
          } catch {
            if (active) {
              setMetrics(null);
            }
          }
        } else {
          setMetrics(null);
        }

        const errors = [gymListResult, userListResult, dashboardResult]
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => result.reason)
          .filter((reason): reason is Error => reason instanceof Error);

        const hasNonPermissionError = errors.some(
          (reason) => !(reason instanceof ApiFetchError && reason.statusCode === 403),
        );

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

  const memberRows = useMemo<DashboardMemberRow[]>(() => mapUsersToMemberRows(users), [users]);

  const mrr = summary?.mrr ?? null;
  const chartMax = Math.max(...(metrics?.daily.map((item) => Math.max(item.bookings, item.checkins)) ?? [0]));

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-6 pt-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stable production dashboard powered by live org, location, members, and billing data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/platform/gyms/new" className="button">
            Create location
          </Link>
          <Link href="/platform/settings" className="button secondary">
            Settings
          </Link>
        </div>
        </header>

        {error ? <ErrorState message={error} /> : null}

        <section className="grid gap-3 sm:gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Locations" value={String(summary?.locations ?? gyms.length)} />
        <DashboardStat label="Members" value={String(summary?.members ?? users.length)} />
        <DashboardStat label="MRR" value={mrr === null ? "—" : `$${mrr.toFixed(2)}`} hint={mrr === null ? "Not available" : "Monthly recurring revenue"} />
        <DashboardStat label="Invites" value={String(summary?.invites ?? 0)} hint="Pending organization invites" />
        </section>

        <section className="grid gap-3 sm:gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-5">
          <DashboardStat label="Bookings (30d)" value={formatDashboardMetric(Boolean(metrics), metrics?.kpis.bookings)} hint={metrics ? "Class bookings created" : "No metrics have been recorded yet."} />
          <DashboardStat label="Check-ins (30d)" value={formatDashboardMetric(Boolean(metrics), metrics?.kpis.checkins)} hint={metrics ? "Completed check-ins" : "No metrics have been recorded yet."} />
          <DashboardStat label="New clients (30d)" value={formatDashboardMetric(Boolean(metrics), metrics?.kpis.newClients)} hint={metrics ? "New client profiles" : "No metrics have been recorded yet."} />
          <DashboardStat label="Membership churn (30d)" value={formatDashboardMetric(Boolean(metrics), metrics?.kpis.churnedMemberships)} hint={metrics ? "Canceled memberships" : "No metrics have been recorded yet."} />
          <DashboardStat label="Active memberships" value={formatDashboardMetric(Boolean(metrics), metrics?.kpis.latestActiveMemberships)} hint={metrics ? "Latest daily snapshot" : "No metrics have been recorded yet."} />
        </section>

        <section className={shellCardClassName("p-4 sm:p-5")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Bookings & check-ins trend (30d)</h2>
          </div>
          {!metrics || metrics.daily.length === 0 ? (
            <EmptyState title="No metrics data yet" description="Daily location metrics will appear after bookings and check-ins are recorded." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${metrics.daily.length}, minmax(0, 1fr))` }}>
                {metrics.daily.map((point) => {
                  const bookingHeight = chartMax > 0 ? Math.max(4, Math.round((point.bookings / chartMax) * 80)) : 4;
                  const checkinHeight = chartMax > 0 ? Math.max(4, Math.round((point.checkins / chartMax) * 80)) : 4;
                  return (
                    <div className="flex h-24 items-end gap-0.5" key={point.date} title={`${point.date}: ${point.bookings} bookings, ${point.checkins} check-ins`}>
                      <span className="w-1.5 rounded-sm bg-blue-500/80" style={{ height: `${bookingHeight}%` }} />
                      <span className="w-1.5 rounded-sm bg-emerald-500/80" style={{ height: `${checkinHeight}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500/80" />Bookings</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500/80" />Check-ins</span>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className={shellCardClassName("p-4 sm:p-5")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Locations</h2>
            <Link href="/platform/gyms" className="button button-sm ghost">
              View all
            </Link>
          </div>

          {loading ? <LoadingState message="Loading locations..." /> : null}

          {!loading && gyms.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description="Create your first location to start onboarding staff and members."
              action={<Link href="/platform/gyms/new" className="button">Create location</Link>}
            />
          ) : null}

          {!loading && gyms.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Domain</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gyms.slice(0, 8).map((gym) => (
                    <tr key={gym.id} className="text-foreground hover:bg-accent/30">
                      <td className="px-4 py-3">{gym.name}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
                        {gym.customDomain ?? "Not configured"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {gym.customDomain ? (
                          <Link href={`/platform/gyms/${gym.id}`} className="button button-sm secondary">
                            Open
                          </Link>
                        ) : (
                          <Link href={`/platform/gyms/${gym.id}/edit`} className="button button-sm secondary">
                            Configure domain
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className={shellCardClassName("p-4 sm:p-5")}>
          <h2 className="mb-4 text-base font-semibold text-foreground">Recent members</h2>

          {loading ? <LoadingState message="Loading members..." /> : null}

          {!loading && memberRows.length === 0 ? (
            <EmptyState title="No members yet" description="Members will appear here after invitations and signups." />
          ) : null}

          {!loading && memberRows.length > 0 ? (
            <ul className="space-y-2">
              {memberRows.map((member) => (
                <li key={member.id} className="flex items-center justify-between rounded-xl border border-border bg-card text-card-foreground p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <StatusPill status={member.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </article>
        </section>

        <section>
          <WeeklyAiBriefCard />
        </section>
      </div>
    </main>
  );
}
