"use client";

import { useEffect, useState } from 'react';
import { Badge, Card, EmptyState, PageHeader, PageShell } from '../../components/ui';
import { useToast } from '../../../src/components/toast/ToastProvider';
import { getMyMembership } from '../../../src/lib/memberships';
import { ClientMembership } from '../../../src/types/memberships';

const statusTone: Record<ClientMembership['status'], 'success' | 'warning'> = {
  active: 'success',
  trialing: 'success',
  paused: 'warning',
  canceled: 'warning',
  past_due: 'warning',
};

export default function MembershipPage() {
  const toast = useToast();
  const [membership, setMembership] = useState<ClientMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembership = async () => {
      try {
        setLoading(true);
        setMembership(await getMyMembership());
      } catch (error) {
        toast.error('Unable to load membership', error instanceof Error ? error.message : 'Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    void loadMembership();
  }, []);

  return (
    <PageShell>
      <PageHeader title="My Membership" subtitle="View your current plan, status, and renewal details." />
      {loading ? <Card title="Loading membership" description="Fetching your latest membership details." /> : null}
      {!loading && !membership ? (
        <EmptyState
          title="No membership assigned yet"
          description="Your gym team will assign a membership plan soon."
          icon={<span>◇</span>}
        />
      ) : null}
      {!loading && membership ? (
        <Card title={membership.plan?.name ?? 'Custom membership'} description={membership.plan?.description ?? 'Plan details assigned by your location staff.'}>
          <div className="pill-row">
            <Badge tone={statusTone[membership.status]}>{membership.status}</Badge>
            <span className="text-sm text-slate-400">Started {new Date(membership.startAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-slate-300 mt-3">
            Renewal info: Stripe billing details will appear here in a future release.
          </p>
        </Card>
      ) : null}
    </PageShell>
  );
}
