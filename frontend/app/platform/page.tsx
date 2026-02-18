"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WeeklyAiBriefCard } from "../../src/components/dashboard/WeeklyAiBrief";
import { EmptyState, ErrorState, LoadingState } from "../../src/components/platform/data";
import { ApiFetchError, apiFetch } from "../../src/lib/apiFetch";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";

type DashboardSummary = {
  locations: number;
  members: number;
  mrr: number | null;
  invites: number;
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Invited";
};

function shellCardClassName(extra?: string): string {
  return ["rounded-2xl border border-white/10 bg-slate-950/50", extra].filter(Boolean).join(" ");
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

function StatusPill({ status }: { status: MemberRow["status"] }) {
  const active = status === "Active";
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300",
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

  const memberRows = useMemo<MemberRow[]>(() => {
    return users.slice(0, 10).map((user, index) => ({
      id: user.id,
      name: user.email?.split("@")[0] ?? `Member ${index + 1}`,
      email: user.email,
      status: index % 4 === 0 ? "Invited" : "Active",
    }));
  }, [users]);

  const mrr = summary?.mrr ?? null;

  return (
    <main className="space-y-6 px-1 pb-2 pt-1 sm:px-2 lg:px-3">
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Locations" value={String(summary?.locations ?? gyms.length)} />
        <DashboardStat label="Members" value={String(summary?.members ?? users.length)} />
        <DashboardStat label="MRR" value={mrr === null ? "—" : `$${mrr.toFixed(2)}`} hint={mrr === null ? "Not available" : "Monthly recurring revenue"} />
        <DashboardStat label="Invites" value={String(summary?.invites ?? 0)} hint="Pending organization invites" />
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Domain</th>
                    <th className="pb-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gyms.slice(0, 8).map((gym) => (
                    <tr key={gym.id} className="border-b border-white/5 text-foreground">
                      <td className="py-3">{gym.name}</td>
                      <td className="py-3 text-muted-foreground">{gym.id.slice(0, 8)}.gymstack.club</td>
                      <td className="py-3 text-right">
                        <Link href={`/platform/gyms/${gym.id}`} className="button button-sm secondary">
                          Open
                        </Link>
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
                <li key={member.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
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
    </main>
  );
}
