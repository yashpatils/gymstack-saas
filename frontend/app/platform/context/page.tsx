'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/providers/AuthProvider';

export default function ContextSelectionPage(): JSX.Element {
  const router = useRouter();
  const { memberships, chooseContext } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grouped = useMemo(() => memberships, [memberships]);

  const onChoose = async (tenantId: string, gymId?: string | null) => {
    setIsSubmitting(true);
    try {
      await chooseContext(tenantId, gymId ?? undefined);
      router.push('/platform');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Choose workspace</h1>
      <p className="text-sm text-slate-300">Select your active tenant and role context.</p>
      <div className="space-y-3">
        {grouped.map((membership) => (
          <button
            key={membership.id}
            type="button"
            className="w-full rounded-xl border border-white/20 bg-slate-900/60 p-4 text-left"
            disabled={isSubmitting}
            onClick={() => onChoose(membership.tenantId, membership.gymId)}
          >
            <p className="font-medium">Tenant: {membership.tenantId}</p>
            <p className="text-sm text-slate-300">Role: {membership.role}</p>
            {membership.gymId ? <p className="text-sm text-slate-400">Gym: {membership.gymId}</p> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
