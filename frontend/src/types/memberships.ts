export type MembershipPlanInterval = 'month' | 'year' | 'week' | 'day' | 'one_time';
export type ClientMembershipStatus = 'active' | 'paused' | 'canceled' | 'trialing' | 'past_due';

export type MembershipPlan = {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  interval: MembershipPlanInterval;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientMembership = {
  id: string;
  userId: string;
  locationId: string;
  planId: string | null;
  status: ClientMembershipStatus;
  startAt: string;
  endAt: string | null;
  canceledAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  plan: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
    interval: MembershipPlanInterval;
    isActive: boolean;
  } | null;
};
