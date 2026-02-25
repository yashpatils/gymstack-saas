export type AdminMetrics = {
  tenantsTotal: number;
  locationsTotal: number;
  usersTotal: number;
  signups7d: number;
  signups30d: number;
  activeMembershipsTotal: number;
  mrr?: number;
  activeSubscriptions?: number;
};

export type AdminOverview = {
  totals: {
    mrrCents: number;
    activeTenants: number;
    activeSubscriptions: number;
    trials: number;
    pastDue: number;
    canceled: number;
  };
  trends: {
    newTenants7d: number;
    newTenants30d: number;
  };
};

export type AdminAnalyticsOverview = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  mrrCents: number;
  arrCents: number;
  churnedThisMonth: number;
  newTenantsThisMonth: number;
  planDistribution: Array<{ planKey: string; count: number }>;
};

export type AdminAnalyticsGrowth = {
  range: string;
  points: Array<{
    date: string;
    tenants: number;
    mrrCents: number;
  }>;
};

export type AdminAnalyticsHealth = {
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    planKey: string;
    status: string;
    healthScore: number;
    lowActivity: boolean;
    failedPayments: boolean;
    noLocations: boolean;
    noStaffAdded: boolean;
  }>;
};

export type AdminAnalyticsUsage = {
  range: string;
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    apiCalls: number;
    webhookFailures: number;
  }>;
};

export type AdminTenant = {
  tenantId: string;
  tenantName: string;
  createdAt: string;
  subscriptionStatus: string;
  priceId: string | null;
  mrrCents: number;
  whiteLabelEligible: boolean;
  whiteLabelEnabledEffective: boolean;
  locationsCount: number;
  usersCount: number;
  isDisabled: boolean;
  ownersCount?: number;
  managersCount?: number;
  customDomainsCount?: number;
  whiteLabelBranding?: boolean;
};

export type AdminTenantListResponse = {
  items: AdminTenant[];
  page: number;
  total: number;
};

export type AdminTenantDetail = {
  tenant: {
    id: string;
    name: string;
    createdAt: string;
    isDisabled: boolean;
    disabledAt: string | null;
  };
  locations: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  }>;
  keyUsers: Array<{
    id: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    stripeSubscriptionId: string | null;
  }>;
  billing: {
    subscriptionStatus: string;
    priceId: string | null;
    mrrCents: number;
  };
  recentAudit?: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorEmail?: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    metadata: unknown;
    createdAt: string;
    adminUserId: string;
  }>;
};

export type AdminOrgListResponse = {
  items: Array<{
    id: string;
    name: string;
    createdAt: string;
    subscriptionStatus: string;
    mrrCents: number;
    gymsCount: number;
    usersCount: number;
    isDisabled: boolean;
  }>;
  total: number;
};

export type AdminOrgDetail = {
  org: {
    id: string;
    name: string;
    createdAt: string;
    isDisabled: boolean;
    disabledAt: string | null;
    subscriptionStatus: string | null;
  };
  subscription: {
    subscriptionStatus: string;
    priceId: string | null;
    mrrCents: number;
  };
  gyms: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  }>;
  keyUsers: Array<{
    id: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    stripeSubscriptionId: string | null;
  }>;
  events: Array<{
    id: string;
    type: string;
    metadata: unknown;
    createdAt: string;
    adminUserId: string;
  }>;
};
