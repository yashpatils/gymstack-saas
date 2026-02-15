import { User } from '../users/user.model';

export function hasSupportModeContext(user: User | undefined, tenantId: string, locationId?: string): boolean {
  if (!user?.isPlatformAdmin || !user.supportMode) {
    return false;
  }

  if (user.supportMode.tenantId !== tenantId) {
    return false;
  }

  if (!locationId) {
    return true;
  }

  return user.supportMode.locationId === locationId;
}
