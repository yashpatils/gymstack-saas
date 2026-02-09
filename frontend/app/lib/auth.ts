export type TenantRole =
  | "tenant_owner"
  | "tenant_admin"
  | "tenant_staff"
  | "tenant_viewer";

export type PlatformRole = "platform_admin" | "platform_ops" | "support";

export type TenantMembership = {
  slug: string;
  name: string;
  role: TenantRole;
};

export type Session = {
  userId: string;
  name: string;
  email: string;
  platformRole?: PlatformRole;
  tenants: TenantMembership[];
};

export const tenantRoleLabels: Record<TenantRole, string> = {
  tenant_owner: "Owner",
  tenant_admin: "Admin",
  tenant_staff: "Staff",
  tenant_viewer: "Viewer",
};

export const platformRoleLabels: Record<PlatformRole, string> = {
  platform_admin: "Platform admin",
  platform_ops: "Platform ops",
  support: "Support",
};

const tenantRoleCapabilities: Record<TenantRole, string[]> = {
  tenant_owner: [
    "Manage billing and subscription settings",
    "Invite and deactivate team members",
    "Configure trainers and payroll settings",
  ],
  tenant_admin: [
    "Manage members and check-ins",
    "Schedule trainers and classes",
    "Review tenant-level reporting",
  ],
  tenant_staff: [
    "Handle daily check-ins",
    "Update member profiles",
    "View trainer schedules",
  ],
  tenant_viewer: ["View dashboards and read-only reports"],
};

export const defaultSession: Session = {
  userId: "user_312",
  name: "Avery Jordan",
  email: "avery@gymstack.io",
  platformRole: "platform_admin",
  tenants: [
    {
      slug: "atlas-fitness",
      name: "Atlas Fitness",
      role: "tenant_owner",
    },
    {
      slug: "north-peak",
      name: "North Peak Gym",
      role: "tenant_admin",
    },
  ],
};

const tenantNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["tenant_owner", "tenant_admin", "tenant_staff", "tenant_viewer"],
  },
  {
    label: "Members",
    href: "/members",
    roles: ["tenant_owner", "tenant_admin", "tenant_staff"],
  },
  {
    label: "Trainers",
    href: "/trainers",
    roles: ["tenant_owner", "tenant_admin"],
  },
  {
    label: "Billing",
    href: "/billing",
    roles: ["tenant_owner"],
  },
];

const platformNavItems = [
  {
    label: "Overview",
    href: "/platform",
    roles: ["platform_admin", "platform_ops", "support"],
  },
  {
    label: "Users",
    href: "/platform/users",
    roles: ["platform_admin", "platform_ops"],
  },
  {
    label: "Gyms",
    href: "/platform/gyms",
    roles: ["platform_admin", "platform_ops"],
  },
  {
    label: "Tenants",
    href: "/platform/tenants",
    roles: ["platform_admin", "platform_ops"],
  },
  {
    label: "Plans",
    href: "/platform/plans",
    roles: ["platform_admin"],
  },
];

const isTenantRole = (role: string): role is TenantRole =>
  ["tenant_owner", "tenant_admin", "tenant_staff", "tenant_viewer"].includes(
    role,
  );

const isPlatformRole = (role: string): role is PlatformRole =>
  ["platform_admin", "platform_ops", "support"].includes(role);

export function normalizeSession(rawSession?: Partial<Session> | null): Session {
  const tenants: TenantMembership[] = Array.isArray(rawSession?.tenants)
    ? rawSession.tenants
        .filter(
          (tenant: TenantMembership) =>
            typeof tenant?.slug === "string" && isTenantRole(tenant.role),
        )
        .map((tenant: TenantMembership) => ({
          slug: tenant.slug,
          name: tenant.name ?? tenant.slug,
          role: tenant.role,
        }))
    : defaultSession.tenants;

  return {
    ...defaultSession,
    userId: rawSession?.userId ?? defaultSession.userId,
    name: rawSession?.name ?? defaultSession.name,
    email: rawSession?.email ?? defaultSession.email,
    platformRole: isPlatformRole(rawSession?.platformRole ?? "")
      ? rawSession?.platformRole
      : defaultSession.platformRole,
    tenants,
  };
}

export function getTenantMembership(session: Session, slug: string) {
  return session.tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export function getTenantNavItems(role: TenantRole) {
  return tenantNavItems.filter((item) => item.roles.includes(role));
}

export function getPlatformNavItems(role: PlatformRole) {
  return platformNavItems.filter((item) => item.roles.includes(role));
}

export function getTenantCapabilities(role: TenantRole) {
  return tenantRoleCapabilities[role];
}
