import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export const REQUIRE_MEMBERSHIP_ROLES_KEY = 'require_membership_roles';

export const RequireRoles = (...roles: MembershipRole[]) => SetMetadata(REQUIRE_MEMBERSHIP_ROLES_KEY, roles);

