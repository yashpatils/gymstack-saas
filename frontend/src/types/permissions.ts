export type Permission =
  | 'tenant:*'
  | 'tenant:read'
  | 'gym:*'
  | 'gym:create'
  | 'branch:*'
  | 'trainer:*'
  | 'members:*'
  | 'members:read'
  | 'billing:*'
  | 'client:*';
