"use client";

import { AuthGate } from "../../src/components/AuthGate";
import { PlatformAppShell } from "../../src/components/platform/layout/PlatformAppShell";
import { platformNavConfig } from "../../src/config/nav.config";
import { useAuth } from "../../src/providers/AuthProvider";
import type { NavRole } from "../../src/config/nav.config";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, permissionKeys, permissions, activeContext, platformRole, activeTenant } = useAuth();

  const role: NavRole = platformRole === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : (activeContext?.role ?? "CLIENT");
  const navItems = platformNavConfig.filter((item) => {
    if (!item.rolesAllowed.includes(role)) {
      return false;
    }
    if (item.featureFlag === "billing") {
      return permissions.canManageBilling || permissionKeys.includes("billing:manage") || role === "PLATFORM_ADMIN";
    }
    return true;
  });

  return (
    <AuthGate>
      <PlatformAppShell
        navItems={navItems}
        header={{
          leftSlot: <button type="button" className="button ghost" aria-label="notifications">🔔</button>,
          centerSlot: <p className="text-sm font-semibold">{activeTenant?.name ?? "Platform"}</p>,
          rightSlot: <button type="button" className="button secondary" onClick={logout}>{user?.email ?? "Account"}</button>,
        }}
        footer={activeContext?.role === "TENANT_OWNER" ? "Tenant owner controls enabled" : undefined}
      >
        {children}
      </PlatformAppShell>
    </AuthGate>
  );
}
