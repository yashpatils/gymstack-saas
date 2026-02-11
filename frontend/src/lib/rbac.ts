export type AppRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER') {
    return role;
  }

  return 'MEMBER';
}

export function canManageUsers(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'OWNER' || normalized === 'ADMIN';
}

export function canManageBilling(role?: string | null): boolean {
  return canManageUsers(role);
}

export function canManageGyms(role?: string | null): boolean {
  return canManageUsers(role);
}
