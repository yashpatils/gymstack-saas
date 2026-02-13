"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { getBillingStatus } from "../../src/lib/billing";
import { listGyms, type Gym } from "../../src/lib/gyms";
import { listUsers, type User } from "../../src/lib/users";
import { useAuth } from "../../src/providers/AuthProvider";

type DashboardData = {
  gyms: Gym[];
  users: User[];
};

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

const activityItems = [
  "A new location was added to your platform.",
  "User roles were updated for team access.",
  "Billing details were reviewed.",
];

function formatPlanStatus(status?: string | null): string {
  if (!status) {
    return "Unknown";
  }

  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PlatformDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({ gyms: [], users: [] });
  const [planStatus, setPlanStatus] = useState("Free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [gyms, users] = await Promise.all([listGyms(), listUsers()]);

        if (active) {
          setData({
            gyms: Array.isArray(gyms) ? gyms : [],
            users: Array.isArray(users) ? users : [],
          });
        }

        if (user?.id) {
          try {
            const billing = await getBillingStatus(user.id);
            if (active) {
              setPlanStatus(formatPlanStatus(billing.subscriptionStatus));
            }
          } catch {
            if (active) {
              setPlanStatus("Free");
            }
          }
        } else if (active) {
          setPlanStatus("Free");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard data.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const summaryCards = useMemo(
    () => [
      { label: "Total gyms", value: data.gyms.length.toString() },
      { label: "Total users", value: data.users.length.toString() },
      { label: "Current plan", value: planStatus },
    ],
    [data.gyms.length, data.users.length, planStatus],
  );

  const checklistItems = useMemo<ChecklistItem[]>(
    () => [
      {
        id: "create-gym",
        label: "Create your first gym",
        description: "Add your first location so members and staff can be organized.",
        href: "/platform/gyms",
        cta: "Go to gyms",
        done: data.gyms.length > 0,
      },
      {
        id: "invite-team",
        label: "Invite teammates",
        description: "Bring admins and coaches in so they can help run operations.",
        href: "/platform/team",
        cta: "Open team",
        done: data.users.length > 0,
      },
      {
        id: "review-billing",
        label: "Review billing plan",
        description: "Confirm your plan so your team has the right limits as you grow.",
        href: "/platform/billing",
        cta: "Open billing",
        done: planStatus.toLowerCase() !== "free",
      },
    ],
    [data.gyms.length, data.users.length, planStatus],
  );

  return (
    <ProtectedRoute>
      <section className="space-y-6 text-white">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400">
            High-level platform metrics from your live backend data.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-sm"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {loading ? "--" : card.value}
              </p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <h2 className="text-lg font-medium">Getting started</h2>
          <p className="mt-1 text-sm text-slate-400">
            Complete these steps to finish platform setup.
          </p>
          <ul className="mt-4 space-y-3">
            {checklistItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {item.done ? "✅" : "⬜"} {item.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-md border border-cyan-200/40 px-3 py-1.5 text-sm font-medium text-cyan-100"
                >
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {!loading && data.gyms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-500/5 p-6">
            <h2 className="text-lg font-medium text-cyan-100">No gyms yet</h2>
            <p className="mt-2 text-sm text-cyan-50/80">
              Start onboarding your first gym to unlock platform insights.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center rounded-md bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-900"
              >
                Start onboarding
              </Link>
              <Link
                href="/platform/gyms"
                className="inline-flex items-center rounded-md border border-cyan-200/50 px-4 py-2 text-sm font-medium text-cyan-50"
              >
                Go to gyms
              </Link>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <h2 className="text-lg font-medium">Recent activity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Placeholder events until activity tracking is enabled.
          </p>
          <ul className="mt-4 space-y-2">
            {activityItems.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </ProtectedRoute>
  );
}
