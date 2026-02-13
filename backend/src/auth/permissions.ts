import { MembershipRole } from '@prisma/client';

export const PERMISSION_MAP: Record<MembershipRole, string[]> = {
  TENANT_OWNER: ['tenant:manage', 'billing:manage', 'locations:crud', 'users:crud', 'staff:crud', 'clients:crud', 'reports:view_all'],
  TENANT_LOCATION_ADMIN: ['location:manage', 'staff:crud', 'clients:crud', 'programs:crud', 'reports:view_location'],
  GYM_STAFF_COACH: ['clients:read', 'plans:crud', 'attendance:crud', 'schedule:read/write_limited'],
  CLIENT: ['self:read/write', 'plans:read', 'attendance:read'],
};

export function resolvePermissions(role: MembershipRole): string[] {
  return PERMISSION_MAP[role] ?? [];
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}
