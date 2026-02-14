"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { StatCard } from "../../src/components/common/StatCard";
import { EmptyState } from "../../src/components/common/EmptyState";
import { SkeletonBlock } from "../../src/components/common/SkeletonBlock";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";
import { useAuth } from "../../src/providers/AuthProvider";
import { resendVerification } from "../../src/lib/auth";

export default function PlatformPage() {
  const { user } = useAuth();
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [gymData, userData] = await Promise.all([listGyms(), listUsers()]);
        if (!active) return;
        setGyms(gymData);
        setUsers(userData);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load platform data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const coaches = useMemo(() => users.filter((user) => user.role?.includes("COACH") || user.role?.includes("STAFF")).length, [users]);

  return (
    <section className="space-y-6">
      <PageHeader title="Owner Dashboard" subtitle="Track health across locations, people, and operations." actions={<Link href="/platform/gyms" className="button">Create location</Link>} />


      {!user?.emailVerified ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Verify your email to unlock billing, invites, and location management.</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={async () => {
              if (!user?.email) {
                return;
              }
              const response = await resendVerification(user.email);
              setVerificationMessage(response.message);
            }}
          >
            Resend verification email
          </button>
          {verificationMessage ? <p className="mt-2 text-xs text-amber-200">{verificationMessage}</p> : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Retry</button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={`kpi-${index}`} className="h-28" />)
        ) : (
          <>
            <StatCard label="Members" value={String(users.length)} hint="Active identities" />
            <StatCard label="Active staff" value={String(coaches)} hint="Coach + operations" />
            <StatCard label="Revenue" value="$ --" hint="Connect Stripe for live metrics" />
            <StatCard label="Locations" value={String(gyms.length)} hint="Across your org" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-lg font-semibold">Locations</h2>
          {!loading && gyms.length === 0 ? <EmptyState title="Create your first location" description="Start by adding a gym location so staff and clients can be assigned." action={<Link href="/platform/gyms/new" className="button">Add location</Link>} /> : null}
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {gyms.slice(0, 5).map((gym) => (
              <li key={gym.id} className="rounded-xl border border-border/70 bg-black/10 px-3 py-2 text-foreground">{gym.name}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-border bg-card/70 p-5">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Staff invite prepared for onboarding.</li>
            <li>• Billing profile checked in Stripe settings.</li>
            <li>• Attendance sync completed for this week.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
