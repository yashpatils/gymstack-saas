import { MembershipRole } from '@prisma/client';
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
}

export class AuthMeResponseDto {
  user!: MeDto;
  platformRole!: 'PLATFORM_ADMIN' | null;
  memberships!: {
    tenant: TenantMembershipDto[];
    location: LocationMembershipDto[];
  };
  activeContext!: ActiveContextDto;
  activeTenantId?: string | null;
  activeLocationId?: string | null;
  mode?: 'OWNER' | 'MANAGER';
  permissions!: PermissionFlags;
  permissionKeys!: string[];
}
