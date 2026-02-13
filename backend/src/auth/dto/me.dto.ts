import { MembershipRole } from '@prisma/client';

export class MembershipDto {
  id!: string;
  tenantId!: string;
  gymId?: string | null;
  role!: MembershipRole;
  status!: string;
}

export class ActiveContextDto {
  tenantId!: string;
  gymId?: string | null;
  role!: MembershipRole;
}

export class MeDto {
  id!: string;
  email!: string;
  role!: string;
  orgId!: string;
}

export class AuthMeResponseDto {
  user!: MeDto;
  memberships!: MembershipDto[];
  activeContext?: ActiveContextDto;
  permissions!: string[];
}
