"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/providers/AuthProvider";

const LAST_WORKSPACE_KEY = "gymstack_last_workspace";

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { memberships, chooseContext, loading } = useAuth();
  const [query, setQuery] = useState("");

  const filteredMemberships = useMemo(
    () => memberships.filter((membership) => `${membership.tenantId} ${membership.locationId ?? membership.gymId ?? ""} ${membership.role}`.toLowerCase().includes(query.toLowerCase())),
    [memberships, query],
  );

  if (loading) {
    return <main className="p-6 text-white">Loading workspaces...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6 text-white">
      <h1 className="text-3xl font-semibold">Select workspace</h1>
      <p className="text-sm text-slate-300">Choose the tenant/location context for this session.</p>
      <input className="input max-w-md" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by tenant, location, or role" />
      <div className="grid gap-4 md:grid-cols-2">
        {filteredMemberships.map((membership) => (
          <article key={membership.id} className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{membership.role}</p>
            <p className="mt-2 text-lg font-semibold">{membership.tenantId}</p>
            <p className="text-sm text-slate-300">Location: {membership.locationId ?? membership.gymId ?? "All locations"}</p>
            <button
              type="button"
              className="button mt-4"
              onClick={async () => {
                await chooseContext(membership.tenantId, membership.locationId ?? membership.gymId ?? undefined);
                window.localStorage.setItem(LAST_WORKSPACE_KEY, membership.id);
                router.push("/platform");
              }}
            >
              Continue
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
