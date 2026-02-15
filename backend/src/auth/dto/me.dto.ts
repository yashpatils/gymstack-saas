import { MembershipRole } from '@prisma/client';

export class MembershipDto {
  id!: string;
  tenantId!: string;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role!: MembershipRole;
  status!: string;
}

export class ActiveContextDto {
  tenantId!: string;
  gymId?: string | null;
  locationId?: string | null;
  branchId?: string | null;
  role!: MembershipRole;
}

export class MeDto {
  id!: string;
  email!: string;
  role!: string;
  orgId!: string;
  emailVerified!: boolean;
  emailVerifiedAt!: string | null;
}

export class AuthMeResponseDto {
  user!: MeDto;
  platformRole?: 'PLATFORM_ADMIN' | null;
  role?: MembershipRole | null;
  memberships!: MembershipDto[];
  activeContext?: ActiveContextDto;
  activeTenant?: {
    id: string;
    name: string;
  };
  activeLocation?: {
    id: string;
    name: string;
    customDomain?: string | null;
  };
  tenantFeatures?: {
    whiteLabelBranding: boolean;
  };
  activeMode?: 'OWNER' | 'MANAGER';
  canUseSocialLogin?: boolean;
  effectiveRole?: MembershipRole;
  ownerOperatorSettings?: {
    allowOwnerStaffLogin: boolean;
    defaultMode: 'OWNER' | 'MANAGER';
    defaultLocationId?: string | null;
  } | null;
  onboarding?: {
    needsOpsChoice: boolean;
    tenantId?: string;
    locationId?: string;
  };
  permissions!: string[];
}
