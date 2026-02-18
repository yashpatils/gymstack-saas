"use client";

import type { ReactNode } from "react";
import { AppHeader } from "../../../src/components/shell/AppHeader";
import { AppShell } from "../../../src/components/shell/AppShell";
import { adminNavItems } from "../../../src/components/shell/nav-config";
import { useAuth } from "../../../src/providers/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      variant="admin"
      navItems={adminNavItems}
      sidebarTitle="Admin"
      sidebarSubtitle="Platform Console"
      header={({ onToggleMenu, showMenuToggle }) => (
        <AppHeader
          onToggleMenu={onToggleMenu}
          showMenuToggle={showMenuToggle}
          leftExtra={<span className="text-xs uppercase tracking-[0.2em] text-cyan-300">Admin</span>}
          centerContent={<span className="text-sm font-semibold">Platform Console</span>}
          accountName={user?.email ?? "PLATFORM_ADMIN"}
          accountInitials={(user?.name ?? user?.email ?? "PA").trim().slice(0, 2).toUpperCase()}
          accountLinks={[
            { href: "/platform/account", label: "Account info" },
            { href: "/platform/settings", label: "Settings" },
          ]}
          onLogout={logout}
        />
      )}
      footer={<span className="text-xs text-muted-foreground">PLATFORM_ADMIN</span>}
    >
      {children}
    </AppShell>
  );
}
