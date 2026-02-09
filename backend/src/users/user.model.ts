export enum UserRole {
  Admin = 'admin',
  Owner = 'owner',
  Trainer = 'trainer',
  Member = 'member',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
}
