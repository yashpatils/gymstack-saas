import { MembershipRole, SubscriptionStatus } from '@prisma/client';
import { PermissionFlags } from '../permission-resolver';

export class MembershipDto {
  id!: string;
  tenantId!: string;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role!: MembershipRole;
  status!: string;
}

export class TenantMembershipDto {
  tenantId!: string;
  role!: 'TENANT_OWNER';
}

export class LocationMembershipDto {
  tenantId!: string;
  locationId!: string;
  role!: 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT';
}

export class ActiveContextDto {
  tenantId!: string | null;
  locationId!: string | null;
  role!: MembershipRole | null;
}

export class MeDto {
  id!: string;
  email!: string;
  name?: string | null;
  role?: string;
  orgId?: string;
  emailVerified!: boolean;
  emailVerifiedAt!: string | null;
  qaBypass!: boolean;
}

export class GatingStatusDto {
  wouldBeBlocked!: boolean;
  reasonCode!: 'OK' | 'NO_ACTIVE_SUBSCRIPTION';
}


export class AuthContextSummaryDto {
  tenant!: { id: string | null; name: string | null };
  location!: { id: string | null; name: string | null };
}

export class AuthBillingSummaryDto {
  plan!: string;
  trialDaysLeft!: number;
  status!: SubscriptionStatus | 'UNKNOWN';
  gatingSummary!: GatingStatusDto;
}

export class AuthMeResponseDto {
  user!: MeDto;
  isPlatformAdmin!: boolean;
  platformRole!: 'PLATFORM_ADMIN' | null;
  memberships!: {
    tenant: TenantMembershipDto[];
    location: LocationMembershipDto[];
  };
  activeContext!: ActiveContextDto;
  activeTenantId!: string | null;
  activeLocationId!: string | null;
  activeMode!: "OWNER" | "MANAGER";
  permissions!: PermissionFlags;
  permissionKeys!: string[];
  activeTenant?: {
    id: string;
    name: string;
    isDemo?: boolean;
    subscriptionStatus?: SubscriptionStatus;
    trialStartedAt?: string | null;
    trialEndsAt?: string | null;
  } | null;
  activeLocation?: { id: string; name: string; customDomain?: string | null } | null;
  effectiveAccess?: boolean;
  gatingStatus?: GatingStatusDto;
  qaModeEnabled?: boolean;
  context!: AuthContextSummaryDto;
  billing!: AuthBillingSummaryDto;
}
