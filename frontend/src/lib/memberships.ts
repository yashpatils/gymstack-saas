import { apiFetch } from './apiFetch';
import { ClientMembership, ClientMembershipStatus, MembershipPlan, MembershipPlanInterval } from '../types/memberships';

type UpsertMembershipPlanInput = {
  name: string;
  description?: string;
  priceCents?: number;
  interval: MembershipPlanInterval;
  isActive?: boolean;
};

type AssignClientMembershipInput = {
  planId?: string;
  status?: ClientMembershipStatus;
  startAt?: string;
  trialDays?: number;
};

export function listLocationPlans(): Promise<MembershipPlan[]> {
  return apiFetch<MembershipPlan[]>('/api/location/plans');
}

export function createLocationPlan(input: UpsertMembershipPlanInput): Promise<MembershipPlan> {
  return apiFetch<MembershipPlan>('/api/location/plans', {
    method: 'POST',
    body: input,
  });
}

export function updateLocationPlan(planId: string, input: Partial<UpsertMembershipPlanInput>): Promise<MembershipPlan> {
  return apiFetch<MembershipPlan>(`/api/location/plans/${planId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function getClientMembership(userId: string): Promise<ClientMembership | null> {
  return apiFetch<ClientMembership | null>(`/api/location/clients/${userId}/membership`);
}

export function assignClientMembership(userId: string, input: AssignClientMembershipInput): Promise<ClientMembership> {
  return apiFetch<ClientMembership>(`/api/location/clients/${userId}/membership`, {
    method: 'POST',
    body: input,
  });
}

export function getMyMembership(): Promise<ClientMembership | null> {
  return apiFetch<ClientMembership | null>('/api/location/me/membership');
}
