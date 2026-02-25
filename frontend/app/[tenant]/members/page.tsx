"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, PageShell, SectionTitle, Table } from '../../components/ui';
import { useToast } from '../../../src/components/toast/ToastProvider';
import { assignClientMembership, getClientMembership, listLocationPlans, updateClientMembership } from '../../../src/lib/memberships';
import { listUsers, User } from '../../../src/lib/users';
import { ClientMembership, ClientMembershipStatus, MembershipPlan } from '../../../src/types/memberships';
import { ApiFetchError } from '../../../src/lib/apiFetch';
import { useAuth } from '../../../src/providers/AuthProvider';

function statusBadge(status: ClientMembership['status']) {
  if (status === 'active' || status === 'trialing') {
    return <Badge tone="success">{status}</Badge>;
  }

  return <Badge tone="warning">{status}</Badge>;
}

const mutableStatuses: ClientMembershipStatus[] = ['active', 'paused', 'canceled', 'past_due', 'trialing'];

export default function TenantMembersPage() {
  const toast = useToast();
  const { activeContext } = useAuth();
  const gymId = activeContext?.locationId ?? null;
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerMembership, setDrawerMembership] = useState<ClientMembership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [nextStatus, setNextStatus] = useState<ClientMembershipStatus>('paused');
  const [saving, setSaving] = useState(false);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  const loadData = async () => {
    if (!gymId) {
      setUsers([]);
      setPlans([]);
      return;
    }

    try {
      setLoading(true);
      const [nextUsers, nextPlans] = await Promise.all([listUsers(), listLocationPlans(gymId)]);
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
  }, [gymId]);

  const openDrawer = async (user: User) => {
    setDrawerUser(user);
    setSelectedPlanId('');

    try {
      const membership = await getClientMembership(user.id);
      setDrawerMembership(membership);
      if (membership?.status) {
        setNextStatus(membership.status === 'canceled' ? 'active' : 'paused');
      }
    } catch {
      setDrawerMembership(null);
    }
  };

  const assignPlan = async () => {
    if (!drawerUser || !selectedPlanId || !gymId) {
      return;
    }

    try {
      setSaving(true);
      const nextMembership = await assignClientMembership(gymId, drawerUser.id, {
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

  const changeStatus = async () => {
    if (!drawerMembership) {
      return;
    }

    try {
      setSaving(true);
      const updated = await updateClientMembership(drawerMembership.id, { status: nextStatus });
      setDrawerMembership(updated);
      toast.success('Membership updated', `Status changed to ${nextStatus}.`);
    } catch (error) {
      toast.error('Status update failed', error instanceof Error ? error.message : 'Unable to change membership status.');
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
          {!gymId ? <p className="text-sm text-slate-400">Select a location context to manage memberships.</p> : null}
          {gymId && loading ? <p>Loading users…</p> : null}
          {gymId && !loading && users.length === 0 ? (
            <EmptyState title="No users found" description="Invite clients to this location to begin assigning plans." icon={<span>◇</span>} />
          ) : null}
          {gymId && !loading && users.length > 0 ? (
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
            <select className="input" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} disabled={saving || activePlans.length === 0}>
              <option value="">Select plan</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <Button onClick={() => void assignPlan()} disabled={saving || !selectedPlanId}>
              {saving ? 'Assigning…' : 'Assign Plan'}
            </Button>
          </div>
          {drawerMembership ? (
            <div className="pill-row" style={{ marginTop: 12 }}>
              <select className="input" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ClientMembershipStatus)} disabled={saving}>
                {mutableStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => void changeStatus()} disabled={saving || nextStatus === drawerMembership.status}>
                {saving ? 'Updating…' : 'Update Status'}
              </Button>
            </div>
          ) : null}
          <div className="pill-row" style={{ marginTop: 12 }}>
            <Button variant="ghost" onClick={() => setDrawerUser(null)}>Close</Button>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
