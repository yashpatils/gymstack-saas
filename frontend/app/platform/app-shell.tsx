"use client";

import type { ReactNode } from "react";
import { platformNavItems } from "../../src/components/shell/nav-config";
import AppShell from "../../src/components/shell/AppShell";
import { NotificationBell } from "../../src/components/notifications/NotificationBell";
import { ThemeToggle } from "../../src/components/theme/ThemeToggle";
import { PlatformAccountDropdown } from "../../src/components/platform/layout/PlatformAccountDropdown";
import { useAuth } from "../../src/providers/AuthProvider";
import { OrgSwitcher } from '../../src/components/shell/OrgSwitcher';

export function AppShellProvider({ children }: { children: ReactNode }) {
  const { user, logout, platformRole } = useAuth();

  const visibleNavItems = platformNavItems.filter((item) => {
    if (item.debugOnly && process.env.NODE_ENV === 'production') {
      return false;
    }

    if (!item.requiresRole) {
      return true;
    }

    if (item.requiresRole === 'PLATFORM_ADMIN') {
      return platformRole === 'PLATFORM_ADMIN';
    }

    return user?.role === item.requiresRole;
  });

  return (
    <AppShell
      items={visibleNavItems}
      title="Platform"
      leftSlot={<div className="flex items-center gap-2"><OrgSwitcher /><NotificationBell /></div>}
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
