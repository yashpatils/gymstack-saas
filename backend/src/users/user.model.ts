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
}
