import { createElement, type ReactNode } from "react";
import { ShellIcon } from "./ShellIcon";
import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../lib/adminPortal";

const icon = (name: Parameters<typeof ShellIcon>[0]["name"]): ReactNode =>
  createElement(ShellIcon, { name, width: 16, height: 16 });

export type AppNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  section: "core" | "operations" | "settings";
  requiresRole?: "PLATFORM_ADMIN" | "TENANT_OWNER" | "TENANT_LOCATION_ADMIN";
  featureFlag?: string;
  debugOnly?: boolean;
};

export const platformNavItems: AppNavItem[] = [
  { label: "Overview", href: "/platform", icon: icon("home"), section: "core" },
  { label: "Gyms", href: "/platform/gyms", icon: icon("building"), section: "core" },
  { label: "Team", href: "/platform/team", icon: icon("users"), section: "core" },
  { label: "Invites", href: "/platform/invites", icon: icon("search"), section: "core" },
  { label: "Billing", href: "/platform/billing", icon: icon("card"), section: "operations" },
  { label: "Coach", href: "/platform/coach", icon: icon("coach"), section: "operations" },
  { label: "Client", href: "/platform/client", icon: icon("user"), section: "operations" },
  { label: "Insights", href: "/platform/insights", icon: icon("line"), section: "operations" },
  { label: "Analytics", href: "/platform/analytics", icon: icon("pulse"), section: "operations" },
  { label: "Notifications", href: "/platform/notifications", icon: icon("bell"), section: "operations" },
  { label: "Data export", href: "/platform/data", icon: icon("database"), section: "operations" },
  { label: "Settings", href: "/platform/settings", icon: icon("settings"), section: "settings" },
  { label: "Developer", href: "/platform/developer", icon: icon("wrench"), section: "settings" },
  { label: "QA status", href: "/platform/qa", icon: icon("flask"), section: "settings", debugOnly: true },
  { label: "Shell preview", href: "/platform/dev/shell-preview", icon: icon("brain"), section: "settings", debugOnly: true },
  { label: "Location settings", href: "/platform/locations/settings", icon: icon("pin"), section: "settings" },
  {
    label: "Admin",
    href: ADMIN_PORTAL_FRESH_LOGIN_URL,
    icon: icon("shield"),
    section: "settings",
    requiresRole: "PLATFORM_ADMIN",
  },
];

export const adminNavItems: AppNavItem[] = [
  { label: "Dashboard", href: "/admin", requiresRole: "PLATFORM_ADMIN", icon: icon("gauge"), section: "core" },
  { label: "Tenants", href: "/admin/tenants", requiresRole: "PLATFORM_ADMIN", icon: icon("building"), section: "core" },
  { label: "Users", href: "/admin/users", requiresRole: "PLATFORM_ADMIN", icon: icon("users"), section: "core" },
  { label: "Audit", href: "/admin/audit", requiresRole: "PLATFORM_ADMIN", icon: icon("activity"), section: "operations" },
  { label: "Growth", href: "/admin/growth", requiresRole: "PLATFORM_ADMIN", icon: icon("chart"), section: "operations" },
  { label: "Backups", href: "/admin/backups", requiresRole: "PLATFORM_ADMIN", icon: icon("database"), section: "operations" },
];
