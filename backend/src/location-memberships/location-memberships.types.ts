import { ClientMembershipStatus, MembershipPlanInterval } from '@prisma/client';

export type MembershipPlanDto = {
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

export type ClientMembershipDto = {
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
