import type { ReactNode } from "react";

export type NavRole = "TENANT_OWNER" | "TENANT_LOCATION_ADMIN" | "GYM_STAFF_COACH" | "CLIENT" | "PLATFORM_ADMIN";

export type NavItemConfig = {
  label: string;
  icon?: ReactNode;
  href: string;
  rolesAllowed: NavRole[];
  featureFlag?: "billing" | "whiteLabel";
};

export const platformNavConfig: NavItemConfig[] = [
  { label: "Overview", href: "/platform", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH", "PLATFORM_ADMIN"] },
  { label: "Gyms", href: "/platform/gyms", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "PLATFORM_ADMIN"] },
  { label: "Analytics", href: "/platform/analytics", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "PLATFORM_ADMIN"] },
  { label: "Billing", href: "/platform/billing", rolesAllowed: ["TENANT_OWNER", "PLATFORM_ADMIN"], featureFlag: "billing" },
  { label: "Team", href: "/platform/team", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "PLATFORM_ADMIN"] },
  { label: "Invites", href: "/platform/invites", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH", "PLATFORM_ADMIN"] },
  { label: "Settings", href: "/platform/settings", rolesAllowed: ["TENANT_OWNER", "TENANT_LOCATION_ADMIN", "PLATFORM_ADMIN"] },
];

export const adminNavConfig: NavItemConfig[] = [
  { label: "Dashboard", href: "/admin", rolesAllowed: ["PLATFORM_ADMIN"] },
  { label: "Tenants", href: "/admin/tenants", rolesAllowed: ["PLATFORM_ADMIN"] },
  { label: "Users", href: "/admin/users", rolesAllowed: ["PLATFORM_ADMIN"] },
  { label: "Audit", href: "/admin/audit", rolesAllowed: ["PLATFORM_ADMIN"] },
];

export const locationNavConfigStaff: NavItemConfig[] = [
  { label: "Members", href: "/app/members", rolesAllowed: ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH"] },
  { label: "Attendance", href: "/app/attendance", rolesAllowed: ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH"] },
  { label: "Settings", href: "/app/settings", rolesAllowed: ["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH"] },
];

export const locationNavConfigClient: NavItemConfig[] = [
  { label: "Membership", href: "/app/my-membership", rolesAllowed: ["CLIENT"] },
  { label: "Attendance", href: "/app/my-attendance", rolesAllowed: ["CLIENT"] },
  { label: "Settings", href: "/app/settings", rolesAllowed: ["CLIENT"] },
];
