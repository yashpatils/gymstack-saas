import { MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePermissions } from './permissions';

const ROLE_INHERITANCE: Record<MembershipRole, MembershipRole[]> = {
  tenant_owner: ['tenant_owner', 'tenant_admin', 'gym_owner', 'branch_manager'],
  tenant_admin: ['tenant_admin', 'gym_owner', 'branch_manager'],
  gym_owner: ['gym_owner', 'branch_manager'],
  branch_manager: ['branch_manager'],
  personal_trainer: ['personal_trainer'],
  client: ['client'],
};

export type RoleScope = 'tenant' | 'branch';

export function resolveEffectiveRole(baseRole: MembershipRole, scope: RoleScope): MembershipRole {
  if (scope === 'branch' && (baseRole === MembershipRole.tenant_owner || baseRole === MembershipRole.tenant_admin)) {
    return MembershipRole.gym_owner;
  }

  return baseRole;
}

export async function resolveEffectivePermissions(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  branchId?: string,
): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      orgId: tenantId,
      status: MembershipStatus.ACTIVE,
      ...(branchId ? { OR: [{ gymId: null }, { gymId: branchId }] } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  const branchScopedMemberships = memberships.filter((membership) => {
    if (!branchId) {
      return true;
    }

    return membership.gymId === null || membership.gymId === branchId;
  });

  const inheritedRoles = new Set<MembershipRole>();
  for (const membership of branchScopedMemberships) {
    for (const role of ROLE_INHERITANCE[membership.role] ?? [membership.role]) {
      inheritedRoles.add(role);
    }
  }

  const permissions = new Set<string>();
  for (const role of inheritedRoles) {
    for (const permission of resolvePermissions(role)) {
      permissions.add(permission);
    }
  }

  return [...permissions];
}

export async function canManageBranch(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  branchId: string,
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId: tenantId,
      status: MembershipStatus.ACTIVE,
      OR: [
        {
          gymId: branchId,
          role: { in: [MembershipRole.gym_owner, MembershipRole.branch_manager] },
        },
        {
          gymId: null,
          role: { in: [MembershipRole.tenant_owner, MembershipRole.tenant_admin] },
        },
      ],
    },
  });

  return Boolean(membership);
}
