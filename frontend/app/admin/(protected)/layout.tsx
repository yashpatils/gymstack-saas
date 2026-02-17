"use client";

import type { ReactNode } from "react";
import { AppHeader } from "../../../src/components/shell/AppHeader";
import { AppShell } from "../../../src/components/shell/AppShell";
import { adminNavItems } from "../../../src/components/shell/nav-config";
import { SupportModePanel } from "../support-mode-panel";
import { useAuth } from "../../../src/providers/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const displayName = user?.name?.trim() || user?.email || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <AppShell
      variant="admin"
      navItems={adminNavItems}
      sidebarTitle="Platform Admin"
      sidebarSubtitle="Company Console"
      header={({ onToggleMenu, showMenuToggle }) => (
        <AppHeader
          onToggleMenu={onToggleMenu}
          showMenuToggle={showMenuToggle}
          accountName={displayName}
          accountInitials={initials}
          onLogout={logout}
          accountLinks={[{ href: "/platform/account", label: "Account info" }]}
          centerContent={<p className="text-sm text-muted-foreground">Admin Console</p>}
        />
      )}
    >
      <div className="space-y-6">
        <SupportModePanel />
        {children}
      </div>
    </AppShell>
  );
}
