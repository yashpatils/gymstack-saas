export type AdminMetrics = {
  mrr: number;
  arr: number;
  activeTenants: number;
  activeLocations: number;
  activeSubscriptions: number;
  trialingCount: number;
  pastDueCount: number;
};

export type AdminTenant = {
  id: string;
  name: string;
  createdAt: string;
  plan: string;
  subscriptionStatus: string;
  locationCount: number;
};

export type AdminTenantListResponse = {
  items: AdminTenant[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminTenantDetail = {
  id: string;
  name: string;
  createdAt: string;
  locations: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  }>;
  membershipCounts: {
    total: number;
    active: number;
    invited: number;
    disabled: number;
  };
};
