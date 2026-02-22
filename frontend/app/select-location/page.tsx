"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/providers/AuthProvider";

export default function SelectLocationPage() {
  const router = useRouter();
  const { memberships, activeContext, chooseContext } = useAuth();

  const locations = useMemo(
    () => memberships
      .filter((membership) => membership.tenantId === activeContext?.tenantId)
      .map((membership) => ({ tenantId: membership.tenantId, locationId: membership.locationId ?? membership.gymId ?? undefined, id: membership.id })),
    [activeContext?.tenantId, memberships],
  );

  if (!activeContext?.tenantId) {
    router.replace('/select-org');
    return null;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Select location</h1>
      <p className="text-sm text-slate-300">Choose your active location for {activeContext.tenantId}.</p>
      <button className="button secondary" type="button" onClick={async () => { await chooseContext(activeContext.tenantId); router.push('/platform'); }}>
        Continue without location
      </button>
      <div className="grid gap-3">
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            className="button text-left"
            onClick={async () => {
              await chooseContext(location.tenantId, location.locationId);
              router.push('/platform');
            }}
          >
            {location.locationId ?? 'All locations'}
          </button>
        ))}
      </div>
    </main>
  );
}
