"use client";

import type { ReactNode } from "react";
import { AppHeader } from "../../../../src/components/shell/AppHeader";
import { AppShell } from "../../../../src/components/shell/AppShell";
import type { AppNavItem } from "../../../../src/components/shell/nav-config";
import type { NavItemConfig } from "../../../../src/config/nav.config";

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
    icon: "•",
    section: "operations",
  }));
}

export function LocationAppShell({ navItems, locationId, accountName, accountInitials, children }: LocationAppShellProps) {
  return (
    <AppShell
      variant="platform"
      navItems={mapLocationNavItems(navItems)}
      sidebarTitle="Location"
      sidebarSubtitle={locationId}
      header={({ onToggleMenu, showMenuToggle }) => (
        <AppHeader
          onToggleMenu={onToggleMenu}
          showMenuToggle={showMenuToggle}
          centerContent={<span className="text-sm font-semibold">Daily Operations</span>}
          accountName={accountName}
          accountInitials={accountInitials}
          accountLinks={[{ href: "/app/settings", label: "Location settings" }]}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

