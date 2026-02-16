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
  emailVerifiedAt?: string | null;
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

export type CanonicalMemberships = {
  tenant: Array<{ tenantId: string; role: 'TENANT_OWNER' }>;
  location: Array<{ tenantId: string; locationId: string; role: 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT' }>;
};

export type ActiveContext = {
  tenantId: string | null;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role: MembershipRole | null;
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
  whiteLabelEnabled?: boolean;
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

export type PermissionFlags = {
  canManageTenant: boolean;
  canManageLocations: boolean;
  canInviteStaff: boolean;
  canInviteClients: boolean;
  canManageBilling: boolean;
  canManageUsers: boolean;
};

export type AuthMeResponse = {
  user: AuthUser;
  platformRole?: 'PLATFORM_ADMIN' | null;
  memberships: CanonicalMemberships | Membership[];
  activeContext: ActiveContext;
  activeTenantId?: string | null;
  activeLocationId?: string | null;
  mode?: 'OWNER' | 'MANAGER';
  permissions: PermissionFlags | string[];
  permissionKeys?: string[];
  activeTenant?: ActiveTenant;
  activeLocation?: ActiveLocation;
  activeMode?: 'OWNER' | 'MANAGER';
  canUseSocialLogin?: boolean;
  ownerOperatorSettings?: OwnerOperatorSettings | null;
  onboarding?: OnboardingState;
  effectiveRole?: MembershipRole;
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
