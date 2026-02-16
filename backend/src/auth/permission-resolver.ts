import { MembershipRole } from '@prisma/client';

export type PermissionFlags = {
  canManageTenant: boolean;
  canManageLocations: boolean;
  canInviteStaff: boolean;
  canInviteClients: boolean;
  canManageBilling: boolean;
  canManageUsers: boolean;
};

const EMPTY_PERMISSIONS: PermissionFlags = {
  canManageTenant: false,
  canManageLocations: false,
  canInviteStaff: false,
  canInviteClients: false,
  canManageBilling: false,
  canManageUsers: false,
};

export function resolvePermissions(role: MembershipRole | null): PermissionFlags {
  if (!role) {
    return EMPTY_PERMISSIONS;
  }

  if (role === MembershipRole.TENANT_OWNER) {
    return {
      canManageTenant: true,
      canManageLocations: true,
      canInviteStaff: true,
      canInviteClients: true,
      canManageBilling: true,
      canManageUsers: true,
    };
  }

  if (role === MembershipRole.TENANT_LOCATION_ADMIN) {
    return {
      canManageTenant: false,
      canManageLocations: true,
      canInviteStaff: true,
      canInviteClients: true,
      canManageBilling: false,
      canManageUsers: true,
    };
  }

  if (role === MembershipRole.GYM_STAFF_COACH) {
    return {
      canManageTenant: false,
      canManageLocations: false,
      canInviteStaff: false,
      canInviteClients: true,
      canManageBilling: false,
      canManageUsers: false,
    };
  }

  return EMPTY_PERMISSIONS;
}

export function permissionFlagsToKeys(flags: PermissionFlags): string[] {
  const keys: string[] = [];

  if (flags.canManageTenant) keys.push('tenant:manage');
  if (flags.canManageLocations) keys.push('location:manage');
  if (flags.canInviteStaff) keys.push('invites:staff:create');
  if (flags.canInviteClients) keys.push('invites:clients:create');
  if (flags.canManageBilling) keys.push('billing:manage');
  if (flags.canManageUsers) keys.push('users:manage');

  return keys;
}
