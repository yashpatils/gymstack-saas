"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/providers/AuthProvider";

export default function SelectOrgPage() {
  const router = useRouter();
  const { memberships, chooseContext } = useAuth();
  const orgs = useMemo(() => Array.from(new Set(memberships.map((membership) => membership.tenantId))), [memberships]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Select organization</h1>
      <p className="text-sm text-slate-300">Choose your active organization context.</p>
      <div className="grid gap-3">
        {orgs.map((orgId) => (
          <button
            key={orgId}
            type="button"
            className="button text-left"
            onClick={async () => {
              await chooseContext(orgId);
              router.push('/select-location');
            }}
          >
            {orgId}
          </button>
        ))}
      </div>
    </main>
  );
}
