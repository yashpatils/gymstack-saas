'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiFetchError } from '../../../src/lib/apiFetch';
import { useAuth } from '../../../src/providers/AuthProvider';

type LocationSettings = {
  id: string;
  name: string;
  timezone: string;
};

export default function LocationSettingsPage() {
  const router = useRouter();
  const { activeContext, permissions, memberships } = useAuth();
  const [data, setData] = useState<LocationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeGymId = activeContext?.locationId ?? activeContext?.gymId ?? null;
  const isLocationAdmin = useMemo(
    () => memberships.some((membership) => membership.role === 'TENANT_LOCATION_ADMIN' && (membership.locationId === activeGymId || membership.gymId === activeGymId)),
    [activeGymId, memberships],
  );
  const allowed = permissions.canManageTenant || isLocationAdmin;

  useEffect(() => {
    if (!activeGymId) {
      router.replace('/select-location?next=/settings/location');
      return;
    }

    if (!allowed) {
      return;
    }

    void apiFetch<LocationSettings>(`/api/gyms/${activeGymId}/settings`, { method: 'GET' })
      .then(setData)
      .catch((loadError) => {
        if (loadError instanceof ApiFetchError && loadError.statusCode === 403) {
          setError('Not authorized');
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load location settings.');
      });
  }, [activeGymId, allowed, router]);

  if (!activeGymId) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
        <h1 className="text-2xl font-semibold">Location settings</h1>
        <p>Location context is required.</p>
        <Link href="/select-location?next=/settings/location" className="button">Select location</Link>
      </main>
    );
  }

  if (!allowed) {
    return <main className="mx-auto max-w-2xl p-6 text-white"><p>Not authorized</p></main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-6 text-white">
      <h1 className="text-2xl font-semibold">Location settings</h1>
      {error ? <p className="text-rose-300">{error}</p> : null}
      {data ? <p className="text-slate-300">{data.name} · {data.timezone}</p> : <p>Loading…</p>}
    </main>
  );
}
