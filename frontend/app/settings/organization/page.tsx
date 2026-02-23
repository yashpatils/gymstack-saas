'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiFetchError } from '../../../src/lib/apiFetch';
import { getOrg, updateOrg } from '../../../src/lib/orgs';
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
  const [name, setName] = useState('');
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

    void getOrg(activeOrgId)
      .then((org) => {
        setData(org);
        setName(org.name);
      })
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
      {data ? (
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          const next = await updateOrg(activeOrgId, { name });
          setData(next);
        }}>
          <label className="block text-sm">Name</label>
          <input className="input w-full" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="button">Save</button>
          <p className="text-slate-300">White-label: {data.whiteLabelEnabled ? 'On' : 'Off'}</p>
        </form>
      ) : <p>Loading…</p>}
    </main>
  );
}
