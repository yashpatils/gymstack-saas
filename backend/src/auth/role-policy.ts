import { MembershipRole } from '@prisma/client';

export const ROLE_POLICY: Record<MembershipRole, MembershipRole[]> = {
  [MembershipRole.TENANT_OWNER]: [
    MembershipRole.TENANT_OWNER,
    MembershipRole.TENANT_LOCATION_ADMIN,
    MembershipRole.GYM_STAFF_COACH,
    MembershipRole.CLIENT,
  ],
  [MembershipRole.TENANT_LOCATION_ADMIN]: [
    MembershipRole.TENANT_LOCATION_ADMIN,
    MembershipRole.GYM_STAFF_COACH,
    MembershipRole.CLIENT,
  ],
  [MembershipRole.GYM_STAFF_COACH]: [MembershipRole.GYM_STAFF_COACH, MembershipRole.CLIENT],
  [MembershipRole.CLIENT]: [MembershipRole.CLIENT],
};

export function roleCanAccessRole(actorRole: MembershipRole, requiredRole: MembershipRole): boolean {
  return ROLE_POLICY[actorRole]?.includes(requiredRole) ?? false;
}

