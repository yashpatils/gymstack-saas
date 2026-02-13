export type MembershipRole =
  | 'tenant_owner'
  | 'tenant_admin'
  | 'gym_owner'
  | 'branch_manager'
  | 'personal_trainer'
  | 'client';

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
  branchId?: string | null;
  role: MembershipRole;
  status: string;
};

export type ActiveContext = {
  tenantId: string;
  gymId?: string | null;
  branchId?: string | null;
  role: MembershipRole;
};

export type AuthMeResponse = {
  user: AuthUser;
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
