"use client";

import type { ReactNode } from "react";
import AppShell from "../../../../src/components/shell/AppShell";
import { ShellIcon } from "../../../../src/components/shell/ShellIcon";
import type { AppNavItem } from "../../../../src/components/shell/nav-config";
import type { NavItemConfig } from "../../../../src/config/nav.config";
import { PlatformAccountDropdown } from "../../../../src/components/platform/layout/PlatformAccountDropdown";

type LocationAppShellProps = {
  navItems: NavItemConfig[];
  locationId: string;
  accountName: string;
  accountInitials: string;
  children: ReactNode;
};

function mapLocationNavItems(navItems: NavItemConfig[]): AppNavItem[] {
  return navItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: <ShellIcon name="building" width={14} height={14} />,
    section: "operations",
  }));
}

export function LocationAppShell({
  navItems,
  locationId,
  accountName,
  accountInitials,
  children,
}: LocationAppShellProps) {
  return (
    <AppShell
      items={mapLocationNavItems(navItems)}
      title="Daily Operations"
      subtitle={locationId}
      rightSlot={
        <PlatformAccountDropdown
          label={accountName}
          initials={accountInitials}
          onLogout={() => undefined}
        />
      }
    >
      {children}
    </AppShell>
  );
}
