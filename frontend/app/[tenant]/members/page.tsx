"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, PageShell, SectionTitle, Table } from '../../components/ui';
import { useToast } from '../../../src/components/toast/ToastProvider';
import { assignClientMembership, getClientMembership, listLocationPlans } from '../../../src/lib/memberships';
import { listUsers, User } from '../../../src/lib/users';
import { ClientMembership, MembershipPlan } from '../../../src/types/memberships';
import { ApiFetchError } from '../../../src/lib/apiFetch';

function statusBadge(status: ClientMembership['status']) {
  if (status === 'active' || status === 'trialing') {
    return <Badge tone="success">{status}</Badge>;
  }

  return <Badge tone="warning">{status}</Badge>;
}

export default function TenantMembersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerMembership, setDrawerMembership] = useState<ClientMembership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [nextUsers, nextPlans] = await Promise.all([listUsers(), listLocationPlans()]);
      setUsers(nextUsers);
      setPlans(nextPlans);
    } catch (error) {
      if (error instanceof ApiFetchError && error.statusCode === 403) {
        setUsers([]);
        toast.error('Insufficient permissions', 'Your role cannot view the full user roster for this location.');
      } else {
        toast.error('Unable to load members', error instanceof Error ? error.message : 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openDrawer = async (user: User) => {
    setDrawerUser(user);
    setSelectedPlanId('');

    try {
      const membership = await getClientMembership(user.id);
      setDrawerMembership(membership);
    } catch {
      setDrawerMembership(null);
    }
  };

  const assignPlan = async () => {
    if (!drawerUser || !selectedPlanId) {
      return;
    }

    try {
      setSaving(true);
      const nextMembership = await assignClientMembership(drawerUser.id, {
        planId: selectedPlanId,
      });
      setDrawerMembership(nextMembership);
      toast.success('Membership assigned', 'Plan assignment completed successfully.');
    } catch (error) {
      toast.error('Assignment failed', error instanceof Error ? error.message : 'Unable to assign this plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="Members" subtitle="Manage member profiles and assign location memberships." />

      <section className="section">
        <SectionTitle>Member roster</SectionTitle>
        <Card title="All users" description="Select a user to review and assign memberships.">
          {loading ? <p>Loading users…</p> : null}
          {!loading && users.length === 0 ? (
            <EmptyState title="No users found" description="Invite clients to this location to begin assigning plans." icon={<span>◇</span>} />
          ) : null}
          {!loading && users.length > 0 ? (
            <Table
              headers={['User', 'Email', 'Actions']}
              rows={users.map((user) => [
                user.id,
                user.email,
                <Button key={`${user.id}-assign`} variant="secondary" onClick={() => void openDrawer(user)}>
                  Membership
                </Button>,
              ])}
            />
          ) : null}
        </Card>
      </section>

      {drawerUser ? (
        <Card title={`Membership · ${drawerUser.email}`} description="Assign a plan and review current status.">
          {drawerMembership ? (
            <div className="pill-row">
              {statusBadge(drawerMembership.status)}
              <span className="text-sm text-slate-400">Current plan: {drawerMembership.plan?.name ?? 'Custom'}</span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No membership currently assigned.</p>
          )}
          <div className="pill-row" style={{ marginTop: 12 }}>
            <select
              className="input"
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              disabled={saving || activePlans.length === 0}
            >
              <option value="">Select plan</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <Button onClick={() => void assignPlan()} disabled={saving || !selectedPlanId}>
              {saving ? 'Assigning…' : 'Assign Plan'}
            </Button>
            <Button variant="ghost" onClick={() => setDrawerUser(null)}>Close</Button>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
