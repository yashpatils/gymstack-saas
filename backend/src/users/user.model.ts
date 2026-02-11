export enum UserRole {
  Admin = 'ADMIN',
  Owner = 'OWNER',
  User = 'USER',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  orgId?: string | null;
}
