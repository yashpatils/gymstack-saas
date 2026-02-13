import { MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePermissions } from './permissions';

const ROLE_INHERITANCE: Record<MembershipRole, MembershipRole[]> = {
  TENANT_OWNER: ['TENANT_OWNER', 'TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH', 'CLIENT'],
  TENANT_LOCATION_ADMIN: ['TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH', 'CLIENT'],
  GYM_STAFF_COACH: ['GYM_STAFF_COACH', 'CLIENT'],
  CLIENT: ['CLIENT'],
};

export async function resolveEffectivePermissions(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  locationId?: string,
): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      orgId: tenantId,
      status: MembershipStatus.ACTIVE,
      ...(locationId ? { OR: [{ gymId: null }, { gymId: locationId }] } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  const roles = new Set<MembershipRole>();
  memberships.forEach((membership) => {
    (ROLE_INHERITANCE[membership.role] ?? [membership.role]).forEach((role) => roles.add(role));
  });

  const permissions = new Set<string>();
  roles.forEach((role) => resolvePermissions(role).forEach((permission) => permissions.add(permission)));

  return [...permissions];
}

export async function canManageLocation(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  locationId: string,
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId: tenantId,
      status: MembershipStatus.ACTIVE,
      OR: [
        { gymId: null, role: MembershipRole.TENANT_OWNER },
        { gymId: locationId, role: MembershipRole.TENANT_LOCATION_ADMIN },
      ],
    },
    select: { id: true },
  });

  return Boolean(membership);
}
