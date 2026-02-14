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

export type AdminTenant = {
  tenantId: string;
  tenantName: string;
  createdAt: string;
  locationsCount: number;
  ownersCount: number;
  managersCount: number;
  customDomainsCount: number;
  subscriptionStatus?: string | null;
};

export type AdminTenantListResponse = {
  items: AdminTenant[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminTenantDetail = {
  tenant: {
    id: string;
    name: string;
    createdAt: string;
    subscriptionStatus?: string | null;
  };
  locations: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    membersCount: number;
    managersCount: number;
    customDomains: string[];
  }>;
  owners: Array<{
    id: string;
    email: string;
    name?: string;
  }>;
  recentAudit?: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorEmail?: string;
  }>;
};
