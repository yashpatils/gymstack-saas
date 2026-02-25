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

type UpdateClientMembershipInput = {
  status: ClientMembershipStatus;
  adminOverride?: boolean;
};

export function listLocationPlans(gymId: string): Promise<MembershipPlan[]> {
  return apiFetch<MembershipPlan[]>(`/api/gyms/${gymId}/plans`);
}

export function createLocationPlan(gymId: string, input: UpsertMembershipPlanInput): Promise<MembershipPlan> {
  return apiFetch<MembershipPlan>(`/api/gyms/${gymId}/plans`, {
    method: 'POST',
    body: input,
  });
}

export function updateLocationPlan(gymId: string, planId: string, input: Partial<UpsertMembershipPlanInput>): Promise<MembershipPlan> {
  return apiFetch<MembershipPlan>(`/api/gyms/${gymId}/plans/${planId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function getClientMembership(userId: string): Promise<ClientMembership | null> {
  return apiFetch<ClientMembership | null>(`/api/location/clients/${userId}/membership`);
}

export function assignClientMembership(gymId: string, userId: string, input: AssignClientMembershipInput): Promise<ClientMembership> {
  return apiFetch<ClientMembership>(`/api/gyms/${gymId}/clients/${userId}/memberships`, {
    method: 'POST',
    body: input,
  });
}

export function updateClientMembership(membershipId: string, input: UpdateClientMembershipInput): Promise<ClientMembership> {
  return apiFetch<ClientMembership>(`/api/client-memberships/${membershipId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function getMyMembership(): Promise<ClientMembership | null> {
  return apiFetch<ClientMembership | null>('/api/location/me/membership');
}
