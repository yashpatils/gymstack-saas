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
  emailVerified: boolean;
  emailVerifiedAt: string | null;
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



export type ActiveTenant = {
  id: string;
  name: string;
};

export type ActiveLocation = {
  id: string;
  name: string;
  customDomain?: string | null;
};

export type TenantFeatures = {
  whiteLabelBranding: boolean;
};

export type OwnerOperatorSettings = {
  allowOwnerStaffLogin: boolean;
  defaultMode: 'OWNER' | 'MANAGER';
  defaultLocationId?: string | null;
};

export type OnboardingState = {
  needsOpsChoice: boolean;
  tenantId?: string;
  locationId?: string;
};

export type AuthMeResponse = {
  user: AuthUser;
  platformRole?: 'PLATFORM_ADMIN' | null;
  role?: MembershipRole | null;
  memberships: Membership[];
  activeContext?: ActiveContext;
  activeTenant?: ActiveTenant;
  activeLocation?: ActiveLocation;
  activeMode?: 'OWNER' | 'MANAGER';
  canUseSocialLogin?: boolean;
  ownerOperatorSettings?: OwnerOperatorSettings | null;
  onboarding?: OnboardingState;
  effectiveRole?: MembershipRole;
  permissions: string[];
  subscriptionStatus?: string | null;
  stripeConfigured?: boolean;
  tenantFeatures?: TenantFeatures;
};

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  memberships: Membership[];
  activeContext?: ActiveContext;
  activeTenant?: ActiveTenant;
  activeLocation?: ActiveLocation;
  emailDeliveryWarning?: string;
};
