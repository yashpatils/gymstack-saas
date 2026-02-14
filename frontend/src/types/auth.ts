export type MembershipRole =
  | 'TENANT_OWNER'
  | 'TENANT_LOCATION_ADMIN'
  | 'GYM_STAFF_COACH'
  | 'CLIENT';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  tenantId?: string | null;
  orgId?: string | null;
};

export type Membership = {
  id: string;
  tenantId: string;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role: MembershipRole;
  status: string;
};

export type ActiveContext = {
  tenantId: string;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role: MembershipRole;
};

export type AuthMeResponse = {
  user: AuthUser;
  platformRole?: 'PLATFORM_ADMIN' | null;
  memberships: Membership[];
  activeContext?: ActiveContext;
  effectiveRole?: MembershipRole;
  permissions: string[];
  subscriptionStatus?: string | null;
  stripeConfigured?: boolean;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AuthUser;
  memberships: Membership[];
  activeContext?: ActiveContext;
};
