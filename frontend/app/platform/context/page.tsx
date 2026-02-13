'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/providers/AuthProvider';
import { listGyms, type Gym } from '../../../src/lib/gyms';

export default function ContextSelectionPage(): JSX.Element {
  const router = useRouter();
  const { memberships, chooseContext, activeContext } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tenantMemberships = useMemo(
    () => memberships.filter((membership) => membership.tenantId === activeContext?.tenantId),
    [memberships, activeContext?.tenantId],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const nextGyms = await listGyms();
        setGyms(Array.isArray(nextGyms) ? nextGyms : []);
      } catch {
        setGyms([]);
      }
    };

    void load();
  }, []);

  const onChoose = useCallback(async (tenantId: string, gymId?: string | null) => {
    setIsSubmitting(true);
    try {
      await chooseContext(tenantId, gymId ?? undefined);
      router.push('/platform');
    } finally {
      setIsSubmitting(false);
    }
  }, [chooseContext, router]);

  useEffect(() => {
    if (isSubmitting || !activeContext?.tenantId) {
      return;
    }

    if (gyms.length === 1) {
      void onChoose(activeContext.tenantId, gyms[0].id);
    }
  }, [activeContext?.tenantId, gyms, isSubmitting, onChoose]);

  if (!activeContext?.tenantId) {
    return <p className="text-sm text-slate-300">No tenant context found.</p>;
  }

  return (
    <section className="space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Choose location</h1>
      <p className="text-sm text-slate-300">Select your active branch context.</p>
      <div className="space-y-3">
        {gyms.map((gym) => (
          <button
            key={gym.id}
            type="button"
            className="w-full rounded-xl border border-white/20 bg-slate-900/60 p-4 text-left"
            disabled={isSubmitting}
            onClick={() => void onChoose(activeContext.tenantId, gym.id)}
          >
            <p className="font-medium">{gym.name}</p>
            <p className="text-sm text-slate-400">Location ID: {gym.id}</p>
            {tenantMemberships.length > 0 ? <p className="text-sm text-slate-300">Role: {tenantMemberships[0].role}</p> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
