import { MembershipRole } from '@prisma/client';

export const PERMISSION_MAP: Record<MembershipRole, string[]> = {
  tenant_owner: ['tenant:*', 'tenant:read', 'gym:*', 'branch:*', 'billing:*', 'trainer:*', 'members:*', 'client:*'],
  tenant_admin: ['tenant:read', 'gym:*', 'branch:*', 'trainer:*', 'members:*'],
  gym_owner: ['gym:*', 'branch:*', 'trainer:*', 'members:*'],
  branch_manager: ['branch:*', 'members:*', 'members:read'],
  personal_trainer: ['trainer:*', 'members:read'],
  client: ['client:*'],
};

export function resolvePermissions(role: MembershipRole): string[] {
  return PERMISSION_MAP[role] ?? [];
}

export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes(required)) {
    return true;
  }

  const [resource] = required.split(':');
  return permissions.includes(`${resource}:*`);
}
