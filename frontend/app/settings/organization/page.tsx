'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiFetchError } from '../../../src/lib/apiFetch';
import { useAuth } from '../../../src/providers/AuthProvider';

type OrgSettings = {
  id: string;
  name: string;
  whiteLabelEnabled: boolean;
};

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { permissions, activeContext } = useAuth();
  const [data, setData] = useState<OrgSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeOrgId = activeContext?.tenantId ?? null;
  const allowed = permissions.canManageTenant;

  useEffect(() => {
    if (!activeOrgId) {
      router.replace('/select-org?next=/settings/organization');
      return;
    }

    if (!allowed) {
      return;
    }

    void apiFetch<OrgSettings>(`/api/orgs/${activeOrgId}/settings`, { method: 'GET' })
      .then(setData)
      .catch((loadError) => {
        if (loadError instanceof ApiFetchError && loadError.statusCode === 403) {
          setError('Not authorized');
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load organization settings.');
      });
  }, [activeOrgId, allowed, router]);

  if (!activeOrgId) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
        <h1 className="text-2xl font-semibold">Organization settings</h1>
        <p>Organization context is required.</p>
        <Link href="/select-org?next=/settings/organization" className="button">Select organization</Link>
      </main>
    );
  }

  if (!allowed) {
    return <main className="mx-auto max-w-2xl p-6 text-white"><p>Not authorized</p></main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
      <h1 className="text-2xl font-semibold">Organization settings</h1>
      {error ? <p className="text-rose-300">{error}</p> : null}
      {data ? <p className="text-slate-300">{data.name} · White-label: {data.whiteLabelEnabled ? 'On' : 'Off'}</p> : <p>Loading…</p>}
    </main>
  );
}
