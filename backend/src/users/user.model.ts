export enum UserRole {
  Admin = 'ADMIN',
  Owner = 'OWNER',
  Member = 'MEMBER',
  User = 'USER',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  orgId: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: string;
  activeMode?: 'OWNER' | 'MANAGER';
  permissions?: string[];
  isPlatformAdmin?: boolean;
  supportMode?: {
    tenantId: string;
    locationId?: string;
  };
}

