"use client";

import AppShell from "../../src/components/shell/AppShell";
import { platformNavItems } from "../../src/components/shell/nav-config";
import { NotificationBell } from "../../src/components/notifications/NotificationBell";
import { PlatformAccountDropdown } from "../../src/components/platform/layout/PlatformAccountDropdown";
import { ThemeToggle } from "../../src/components/theme/ThemeToggle";
import { useAuth } from "../../src/providers/AuthProvider";

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    logout,
    permissions,
    permissionKeys,
    activeContext,
    platformRole,
    activeTenant,
    qaModeEnabled,
  } = useAuth();

  const role =
    platformRole === "PLATFORM_ADMIN"
      ? "PLATFORM_ADMIN"
      : (activeContext?.role ?? "CLIENT");
  const canManageBilling =
    permissions.canManageBilling ||
    permissionKeys.includes("billing:manage") ||
    role === "PLATFORM_ADMIN";

  const navItems = platformNavItems.filter((item) => {
    if (item.requiresRole === "PLATFORM_ADMIN" && role !== "PLATFORM_ADMIN") return false;
    if ((item.featureFlag === "billing" || item.href === "/platform/billing") && !canManageBilling)
      return false;
    if (item.debugOnly && !qaModeEnabled) return false;
    return role !== "CLIENT" || item.href === "/platform";
  });

  return (
    <AppShell
      items={navItems}
      title={activeTenant?.name ?? "Gym Stack"}
      subtitle={activeTenant?.name ?? "GymStack workspace"}
      leftSlot={<NotificationBell />}
      rightSlot={
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <PlatformAccountDropdown
            label={user?.name ?? user?.email ?? "Account"}
            initials={(user?.name ?? user?.email ?? "A").trim().slice(0, 2).toUpperCase()}
            onLogout={logout}
          />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
