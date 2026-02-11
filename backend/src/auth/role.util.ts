import { UserRole } from '../users/user.model';

export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === UserRole.User) {
    return UserRole.Member;
  }

  return (role as UserRole) ?? UserRole.Member;
}
