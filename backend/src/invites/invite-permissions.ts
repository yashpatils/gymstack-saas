import { ForbiddenException } from '@nestjs/common';
import { MembershipRole, type Membership } from '@prisma/client';

export function assertCanCreateLocationInvite(
  requesterRole: MembershipRole,
  inviteRole: MembershipRole,
  membershipInLocation: Membership | null,
): void {
  const requesterIsOwner = requesterRole === MembershipRole.TENANT_OWNER;
  const requesterIsLocationAdmin = requesterRole === MembershipRole.TENANT_LOCATION_ADMIN;
  const requesterIsStaff = requesterRole === MembershipRole.GYM_STAFF_COACH;

  if (inviteRole === MembershipRole.GYM_STAFF_COACH) {
    if (!requesterIsOwner && !requesterIsLocationAdmin) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return;
  }

  if (inviteRole === MembershipRole.CLIENT) {
    if (requesterIsOwner || requesterIsLocationAdmin) {
      return;
    }

    if (requesterIsStaff && membershipInLocation) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  throw new ForbiddenException('Unsupported invite role');
}
