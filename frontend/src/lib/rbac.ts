export type AppRole = 'TENANT_OWNER' | 'TENANT_MANAGER' | 'STAFF_COACH' | 'CLIENT';

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  TENANT_OWNER: 4,
  TENANT_MANAGER: 3,
  STAFF_COACH: 2,
  CLIENT: 1,
};

export function canAccessRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function normalizeRole(input?: string | null): AppRole {
  switch (input) {
    case 'TENANT_OWNER':
      return 'TENANT_OWNER';
    case 'TENANT_LOCATION_ADMIN':
    case 'TENANT_MANAGER':
      return 'TENANT_MANAGER';
    case 'GYM_STAFF_COACH':
    case 'STAFF_COACH':
      return 'STAFF_COACH';
    case 'CLIENT':
      return 'CLIENT';
    default:
      return 'CLIENT';
  }
}

export function canManageUsers(role?: string | null): boolean {
  if (!role) {
    return false;
  }

  return [
    'OWNER',
    'ADMIN',
    'PLATFORM_ADMIN',
    'TENANT_OWNER',
    'TENANT_MANAGER',
    'TENANT_LOCATION_ADMIN',
  ].includes(role);
}
