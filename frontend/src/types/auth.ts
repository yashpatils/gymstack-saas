export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  tenantId?: string | null;
  orgId?: string | null;
};

export type AuthMeResponse = {
  user: AuthUser;
  subscriptionStatus?: string | null;
  stripeConfigured?: boolean;
};
