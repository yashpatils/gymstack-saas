"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../src/providers/AuthProvider";

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { memberships, chooseContext, loading } = useAuth();

  if (loading) {
    return <main className="p-6 text-white">Loading workspaces...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Choose Workspace / Location</h1>
      {memberships.map((membership) => (
        <button
          key={membership.id}
          type="button"
          className="block w-full rounded-xl border border-white/15 bg-white/5 p-4 text-left"
          onClick={async () => {
            await chooseContext(membership.tenantId, membership.locationId ?? membership.gymId ?? undefined);
            router.push("/platform");
          }}
        >
          <p className="font-medium">Tenant: {membership.tenantId}</p>
          <p className="text-sm text-slate-300">Location: {membership.locationId ?? membership.gymId ?? "All locations"}</p>
          <p className="text-sm text-slate-400">Role: {membership.role}</p>
        </button>
      ))}
    </main>
  );
}
