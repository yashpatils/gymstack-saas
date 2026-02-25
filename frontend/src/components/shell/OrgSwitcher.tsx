"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listOrgs, type OrgSummary } from '../../lib/orgs';
import { useAuth } from '../../providers/AuthProvider';

export function OrgSwitcher() {
  const router = useRouter();
  const { memberships, activeContext, chooseContext } = useAuth();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);

  useEffect(() => {
    void listOrgs().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  const orgHasGym = useMemo(() => {
    const map = new Map<string, boolean>();
    memberships.forEach((membership) => {
      const hasGym = Boolean(membership.locationId ?? membership.gymId);
      map.set(membership.tenantId, Boolean(map.get(membership.tenantId)) || hasGym);
    });
    return map;
  }, [memberships]);

  if (!orgs.length) {
    return null;
  }

  return (
    <select
      aria-label="Select organization"
      className="input h-9 w-full min-w-0 sm:min-w-[180px] rounded-xl border-border bg-card text-sm text-card-foreground"
      value={activeContext?.tenantId ?? orgs[0]?.id}
      onChange={async (event) => {
        const orgId = event.target.value;
        await chooseContext(orgId);
        if (!orgHasGym.get(orgId)) {
          router.push('/select-location');
          return;
        }
        router.refresh();
      }}
    >
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>{org.name}</option>
      ))}
    </select>
  );
}
