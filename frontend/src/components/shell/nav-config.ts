import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../lib/adminPortal";

export type AppNavItem = {
  label: string;
  href: string;
  icon: string;
  section: "core" | "operations" | "settings";
  requiresRole?: "PLATFORM_ADMIN" | "TENANT_OWNER" | "TENANT_LOCATION_ADMIN";
  featureFlag?: string;
  debugOnly?: boolean;
};

export const platformNavItems: AppNavItem[] = [
  { label: "Overview", href: "/platform", icon: "⌂", section: "core" },
  { label: "Gyms", href: "/platform/gyms", icon: "🏢", section: "core" },
  { label: "Team", href: "/platform/team", icon: "👥", section: "core" },
  { label: "Invites", href: "/platform/invites", icon: "✉️", section: "core" },
  { label: "Billing", href: "/platform/billing", icon: "💳", section: "operations" },
  { label: "Coach", href: "/platform/coach", icon: "🏋️", section: "operations" },
  { label: "Client", href: "/platform/client", icon: "🧍", section: "operations" },
  { label: "Insights", href: "/platform/insights", icon: "📈", section: "operations" },
  { label: "Settings", href: "/platform/settings", icon: "⚙", section: "settings" },
  { label: "Developer", href: "/platform/developer", icon: "🧩", section: "settings" },
  { label: "Location settings", href: "/platform/locations/settings", icon: "📍", section: "settings" },
  {
    label: "Admin",
    href: ADMIN_PORTAL_FRESH_LOGIN_URL,
    icon: "🛡",
    section: "settings",
    requiresRole: "PLATFORM_ADMIN",
  },
];

export const adminNavItems: AppNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "⌂", section: "core" },
  { label: "Tenants", href: "/admin/tenants", icon: "🏢", section: "core" },
  { label: "Users", href: "/admin/users", icon: "👤", section: "core" },
  { label: "Audit", href: "/admin/audit", icon: "🧾", section: "operations" },
  { label: "Growth", href: "/admin/growth", icon: "📊", section: "operations" },
];
