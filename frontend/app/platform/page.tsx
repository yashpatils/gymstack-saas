"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataTableColumn } from "../../src/components/DataTable";
import { EmptyState } from "../../src/components/common/EmptyState";
import { KpiSkeletonGrid, TableSkeleton } from "../../src/components/common/LoadingState";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SectionCard } from "../../src/components/common/SectionCard";
import { StatCard } from "../../src/components/common/StatCard";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";
import { apiFetch } from "../../src/lib/apiFetch";
import { track } from "../../src/lib/analytics";
import { getGrowthStatus, type GrowthStatus } from "../../src/lib/growth";
import { useAuth } from "../../src/providers/AuthProvider";
import { UpgradeModal } from "../../src/components/common/UpgradeModal";

type DashboardTab = "locations" | "staff" | "clients";
type DashboardSummary = {
  locations: number;
  members: number;
  mrr: number | null;
  invites: number;
};

export default function PlatformPage() {
  const { memberships, activeContext } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("locations");
  const [growthStatus, setGrowthStatus] = useState<GrowthStatus | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isTenantOwner = memberships.some((membership) => membership.role === "TENANT_OWNER");

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      const [gymResult, userResult, summaryResult, growthResult] = await Promise.allSettled([
        listGyms(),
        listUsers(),
        apiFetch<DashboardSummary>("/api/org/dashboard-summary", { method: "GET" }),
        getGrowthStatus(),
      ]);

      if (!active) {
        return;
      }

      if (gymResult.status === "fulfilled") {
        setGyms(gymResult.value);
      } else {
        setGyms([]);
        setError(gymResult.reason instanceof Error ? gymResult.reason.message : "Could not load platform data.");
      }

      setUsers(userResult.status === "fulfilled" ? userResult.value : []);
      setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : {
        locations: 0,
        members: 0,
        mrr: null,
        invites: 0,
      });

      if (growthResult.status === "fulfilled") {
        setGrowthStatus(growthResult.value);
      }

      setLoading(false);
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!growthStatus) {
      return;
    }

    void track("TENANT_GROWTH_STATUS_VIEWED", {
      tenantId: growthStatus.tenantId,
      completedSteps: growthStatus.completedSteps,
      totalSteps: growthStatus.totalSteps,
      inactiveDays: growthStatus.inactiveDays,
      isTrialExpired: growthStatus.isTrialExpired,
    });
  }, [growthStatus]);

  const showFirstRunState = !loading && isTenantOwner && gyms.length === 0;

  const staff = useMemo(
    () => users.filter((member) => member.role?.includes("COACH") || member.role?.includes("STAFF") || member.role?.includes("ADMIN")),
    [users],
  );
  const clients = useMemo(() => users.filter((member) => member.role?.includes("CLIENT")), [users]);

  const gymColumns: DataTableColumn<Gym>[] = [
    { id: "name", header: "Location", cell: (gym) => gym.name, sortable: true, sortValue: (gym) => gym.name },
    { id: "slug", header: "Domain", cell: (gym) => `${gym.id.slice(0, 8)}.gymstack.club`, searchValue: (gym) => gym.id },
    { id: "owner", header: "Owner", cell: (gym) => gym.ownerId.slice(0, 8) },
    {
      id: "actions",
      header: "",
      cell: (gym) => (
        <Link href={`/platform/gyms/${gym.id}`} className="button secondary">
          Open
        </Link>
      ),
    },
  ];

  const userColumns: DataTableColumn<User>[] = [
    { id: "email", header: "Email", cell: (member) => member.email, sortable: true, sortValue: (member) => member.email },
    { id: "role", header: "Role", cell: (member) => member.role ?? "N/A", sortable: true, sortValue: (member) => member.role ?? "" },
    {
      id: "created",
      header: "Created",
      cell: (member) => (member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Unknown"),
      sortable: true,
      sortValue: (member) => member.createdAt ?? "",
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Operational snapshot for your platform workspace and active tenant context."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/gyms/new" className="button">Create gym</Link>
            <Link href="/platform/team" className="button secondary">Invite staff</Link>
            <Link href="/platform/billing" className="button secondary">View billing</Link>
          </div>
        }
      />

      {error && !showFirstRunState ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Retry</button>
        </div>
      ) : null}

      {showFirstRunState ? (
        <div className="rounded-3xl border border-indigo-300/25 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/40 p-14 text-center shadow-2xl shadow-indigo-950/30">
          <h2 className="text-3xl font-semibold text-white">Create your first gym</h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-300">This will be your workspace for staff and members.</p>
          <div className="mt-8 flex justify-center">
            <Link href="/platform/gyms/new" className="button">Create Gym</Link>
          </div>
        </div>
      ) : null}

      {growthStatus ? (
        <div className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Get your gym live</p>
              <p className="text-sm text-slate-200">{growthStatus.completedSteps}/{growthStatus.totalSteps} onboarding steps completed</p>
            </div>
            {growthStatus.completedSteps === growthStatus.totalSteps ? (
              <button className="button" type="button" onClick={() => setIsUpgradeModalOpen(true)}>🎉 Upgrade to remove GymStack branding</button>
            ) : null}
          </div>
          <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {growthStatus.checklist.map((item) => (
              <li key={item.key} className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
                <a className="flex items-center justify-between gap-3" href={item.href}>
                  <span>{item.completed ? "✅" : "⬜"} {item.label}</span>
                  <span className="text-xs text-slate-400">Open</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {growthStatus ? (
        <div className={`rounded-xl border p-4 ${growthStatus.isTrialExpired ? "border-rose-400/40 bg-rose-500/10" : "border-amber-300/40 bg-amber-500/10"}`}>
          <p className="text-sm text-white">
            {growthStatus.isTrialExpired
              ? "Trial ended. Upgrade to keep premium growth tools enabled."
              : `Trial ends in ${growthStatus.trialDaysLeft} day${growthStatus.trialDaysLeft === 1 ? "" : "s"}.`}
          </p>
          <button className="button mt-2" type="button" onClick={() => setIsUpgradeModalOpen(true)}>Upgrade</button>
        </div>
      ) : null}

      {growthStatus && growthStatus.inactiveDays > 0 ? (
        <div className="rounded-xl border border-sky-300/40 bg-sky-500/10 p-4">
          <h3 className="font-semibold text-white">We can help you get clients booking again</h3>
          <p className="mt-1 text-sm text-slate-200">No recent activity for {growthStatus.inactiveDays}+ days.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/platform/users" className="button secondary">Invite clients</a>
            <a href="/classes" className="button secondary">Create class</a>
            <a href="/platform/support" className="button secondary">Marketing tips</a>
          </div>
        </div>
      ) : null}

      {loading ? (
        <KpiSkeletonGrid />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Locations" value={String(summary?.locations ?? gyms.length)} icon="📍" hint="Active locations" />
          <StatCard label="Active Members" value={String(summary?.members ?? users.length)} icon="👥" hint="People in workspace" />
          <StatCard label="MRR" value={summary?.mrr == null ? "$ --" : `$ ${summary.mrr}`} icon="💳" hint="Connect Stripe for live values" />
          <StatCard label="Pending Invites" value={String(summary?.invites ?? 0)} icon="✉️" hint="Awaiting acceptance" />
        </div>
      )}

      <div className="dashboard-main-grid">
        <div className="space-y-4">
          <SectionCard title="Recent activity">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Workspace context synced.</li>
              <li>• {gyms.length} locations synced.</li>
              <li>• {users.length} identities indexed for access control.</li>
            </ul>
          </SectionCard>
          <SectionCard title="Quick actions">
            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/platform/team" className="quick-action">Invite user</Link>
              <Link href="/platform/gyms/new" className="quick-action">Add location</Link>
              <Link href="/platform/settings" className="quick-action">Manage domains</Link>
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Current context">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Scope: {activeContext?.locationId ? "Single location" : "All locations"}</p>
              <p>Memberships: {memberships.length}</p>
            </div>
          </SectionCard>
          <SectionCard title="What's new">
            {whatsNew.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changelog updates yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {whatsNew.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <p className="font-medium text-foreground">{entry.title}</p>
                    <p>{entry.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Support">
            <p className="text-sm text-muted-foreground">Need help with onboarding or billing setup?</p>
            <Link href="/platform/support" className="button secondary mt-3 inline-flex">Contact support</Link>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Workspace data"
        actions={
          <div className="tab-list">
            <button type="button" className={`tab ${activeTab === "locations" ? "active" : ""}`} onClick={() => setActiveTab("locations")}>Gyms / Locations</button>
            <button type="button" className={`tab ${activeTab === "staff" ? "active" : ""}`} onClick={() => setActiveTab("staff")}>Staff</button>
            <button type="button" className={`tab ${activeTab === "clients" ? "active" : ""}`} onClick={() => setActiveTab("clients")}>Clients</button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton columns={4} />
        ) : null}
        {!loading && activeTab === "locations" ? (
          <DataTable
            rows={gyms}
            columns={gymColumns}
            getRowKey={(row) => row.id}
            searchPlaceholder="Search locations"
            emptyState={<EmptyState title="No locations yet" description="Create your first location to begin managing members and staff." action={<Link href="/platform/gyms/new" className="button">Create location</Link>} />}
            pageSize={6}
          />
        ) : null}
        {!loading && activeTab === "staff" ? (
          <DataTable
            rows={staff}
            columns={userColumns}
            getRowKey={(row) => row.id}
            searchPlaceholder="Search staff"
            emptyState={<EmptyState title="No staff yet" description="Invite your first staff member to collaborate." action={<Link href="/platform/team" className="button">Invite staff</Link>} />}
            pageSize={6}
          />
        ) : null}
        {!loading && activeTab === "clients" ? (
          <DataTable
            rows={clients}
            columns={userColumns}
            getRowKey={(row) => row.id}
            searchPlaceholder="Search clients"
            emptyState={<EmptyState title="No clients yet" description="Clients will appear here once invited or onboarded." />}
            pageSize={6}
          />
        ) : null}
      </SectionCard>

      <UpgradeModal open={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </section>
  );
}
