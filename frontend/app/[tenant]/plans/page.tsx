"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, PageHeader, PageShell, Table } from '../../components/ui';
import { useToast } from '../../../src/components/toast/ToastProvider';
import { createLocationPlan, listLocationPlans, updateLocationPlan } from '../../../src/lib/memberships';
import { useAuth } from '../../../src/providers/AuthProvider';
import { MembershipPlan, MembershipPlanInterval } from '../../../src/types/memberships';

const intervalLabels: Record<MembershipPlanInterval, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
  one_time: 'One-time',
};

export default function PlansPage() {
  const toast = useToast();
  const { activeContext } = useAuth();
  const activeGymId = activeContext?.locationId ?? null;
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priceCents: '', interval: 'month' as MembershipPlanInterval });

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive).length, [plans]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      if (!activeGymId) {
        setPlans([]);
        return;
      }
      setPlans(await listLocationPlans(activeGymId));
    } catch (error) {
      toast.error('Unable to load plans', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, [activeGymId]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (!activeGymId) {
        toast.error('Select a location', 'Choose a location context before creating plans.');
        return;
      }

      await createLocationPlan(activeGymId, {
        name: form.name,
        description: form.description || undefined,
        interval: form.interval,
        priceCents: form.priceCents ? Number(form.priceCents) : undefined,
      });
      toast.success('Plan created', 'Membership plan is now available for assignment.');
      setForm({ name: '', description: '', priceCents: '', interval: 'month' });
      setShowCreate(false);
      await loadPlans();
    } catch (error) {
      toast.error('Failed to create plan', error instanceof Error ? error.message : 'Please verify fields and retry.');
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = async (plan: MembershipPlan) => {
    try {
      setSaving(true);
      if (!activeGymId) {
        toast.error('Select a location', 'Choose a location context before updating plans.');
        return;
      }

      await updateLocationPlan(activeGymId, plan.id, { isActive: !plan.isActive });
      toast.success('Plan updated', `${plan.name} is now ${plan.isActive ? 'inactive' : 'active'}.`);
      await loadPlans();
    } catch (error) {
      toast.error('Failed to update plan', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Membership Plans"
        subtitle="Create and manage location plans that power recurring revenue."
        actions={<Button onClick={() => setShowCreate((current) => !current)}>{showCreate ? 'Close' : 'Create plan'}</Button>}
      />

      <div className="grid grid-3">
        <Card title="Total plans" description={String(plans.length)} />
        <Card title="Active plans" description={String(activePlans)} footer={<Badge tone="success">Live</Badge>} />
        <Card title="Inactive plans" description={String(plans.length - activePlans)} footer={<Badge tone="warning">Needs review</Badge>} />
      </div>

      {showCreate ? (
        <Card title="Create membership plan" description="Define plan details for this location.">
          <form className="grid grid-2 gap-4" onSubmit={onCreate}>
            <Input
              label="Plan name"
              name="plan-name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Plan name"
            />
            <select
              className="input"
              value={form.interval}
              onChange={(event) => setForm((current) => ({ ...current, interval: event.target.value as MembershipPlanInterval }))}
            >
              {Object.entries(intervalLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Input
              label="Price in cents"
              name="price-cents"
              value={form.priceCents}
              onChange={(event) => setForm((current) => ({ ...current, priceCents: event.target.value }))}
              placeholder="Price in cents (optional)"
            />
            <Input
              label="Description"
              name="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description (optional)"
            />
            <div>
              <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save plan'}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <section className="section">
        <Card title="Plan catalog" description="Location-scoped plans with status controls.">
          {loading ? <p>Loading plans…</p> : null}
          {!loading && plans.length === 0 ? (
            <EmptyState title="No plans yet" description="Create your first plan to start assigning memberships." icon={<span>◇</span>} />
          ) : null}
          {!loading && plans.length > 0 ? (
            <Table
              headers={['Plan', 'Interval', 'Price', 'Status', 'Action']}
              rows={plans.map((plan) => [
                <div key={`${plan.id}-name`}>
                  <div className="font-semibold text-white">{plan.name}</div>
                  <div className="text-xs text-slate-400">{plan.description ?? 'No description'}</div>
                </div>,
                intervalLabels[plan.interval],
                plan.priceCents === null ? '—' : `$${(plan.priceCents / 100).toFixed(2)}`,
                <Badge key={`${plan.id}-status`} tone={plan.isActive ? 'success' : 'warning'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>,
                <Button key={`${plan.id}-toggle`} variant="secondary" disabled={saving} onClick={() => void togglePlan(plan)}>
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </Button>,
              ])}
            />
          ) : null}
        </Card>
      </section>
    </PageShell>
  );
}
