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
  memberships!: MembershipDto[];
  activeContext?: ActiveContextDto;
  activeMode?: 'OWNER' | 'MANAGER';
  canUseSocialLogin?: boolean;
  effectiveRole?: MembershipRole;
  permissions!: string[];
}
