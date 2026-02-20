"use client";

import { AuthGate } from "../../src/components/AuthGate";
import { BillingBanner } from "../../src/components/billing/BillingBanner";
import { HeaderBar } from "../../src/components/shell/HeaderBar";
import { AppShell as BaseAppShell } from "../../src/components/shell/AppShell";
import { platformNavItems } from "../../src/components/shell/nav-config";
import { NotificationBell } from "../../src/components/notifications/NotificationBell";
import { platformNavConfig, type NavRole } from "../../src/config/nav.config";
import { useAuth } from "../../src/providers/AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, permissionKeys, permissions, activeContext, platformRole, activeTenant, qaBypass, gatingStatus, qaModeEnabled } = useAuth();

  const role: NavRole = platformRole === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : (activeContext?.role ?? "CLIENT");
  const canManageBilling = permissions.canManageBilling || permissionKeys.includes("billing:manage") || role === "PLATFORM_ADMIN";

  const navItems = platformNavItems.filter((item) => {
    if (item.requiresRole === "PLATFORM_ADMIN" && role !== "PLATFORM_ADMIN") {
      return false;
    }

    const mappedItem = platformNavConfig.find((configItem) => configItem.href === item.href);
    if (mappedItem && !mappedItem.rolesAllowed.includes(role)) {
      return false;
    }

    if ((item.featureFlag === "billing" || item.href === "/platform/billing") && !canManageBilling) {
      return false;
    }

    if (item.debugOnly && !qaModeEnabled) {
      return false;
    }

    return role !== "CLIENT" || item.href === "/platform";
  });

  return (
    <AuthGate>
      <BaseAppShell
        variant="platform"
        navItems={navItems}
        sidebarTitle="Platform"
        sidebarSubtitle={activeTenant?.name ?? "GymStack workspace"}
        header={({ onToggleMenu, showMenuToggle }) => (
          <HeaderBar
            onToggleMenu={onToggleMenu}
            showMenuToggle={showMenuToggle}
            leftExtra={<NotificationBell />}
            centerContent={<p className="text-sm font-semibold">{activeTenant?.name ?? "Gym Stack"}</p>}
            accountInitials={(user?.name ?? user?.email ?? "A").trim().slice(0, 2).toUpperCase()}
            accountLinks={[
              { href: "/platform/account", label: "Account info" },
              { href: "/platform/settings", label: "Settings" },
            ]}
            onLogout={logout}
            qaBypass={qaBypass}
            gatingStatusSummary={gatingStatus?.reasonCode ?? "OK"}
          />
        )}
        footer={activeContext?.role === "TENANT_OWNER" ? "Tenant owner controls enabled" : undefined}
      >
        <BillingBanner />
        {children}
      </BaseAppShell>
    </AuthGate>
  );
}
