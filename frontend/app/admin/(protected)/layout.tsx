"use client";

import type { ReactNode } from "react";
import AppShell from "../../../src/components/shell/AppShell";
import { PlatformAccountDropdown } from "../../../src/components/platform/layout/PlatformAccountDropdown";
import { adminNavItems } from "../../../src/components/shell/nav-config";
import { ThemeToggle } from "../../../src/components/theme/ThemeToggle";
import { useAuth } from "../../../src/providers/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
        items={adminNavItems}
        title="Platform Console"
        subtitle="Admin"
        leftSlot={<span className="text-xs uppercase tracking-[0.2em] text-cyan-300">Admin</span>}
        rightSlot={
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PlatformAccountDropdown
              label={user?.name ?? user?.email ?? "Admin"}
              initials={(user?.name ?? user?.email ?? "PA").trim().slice(0, 2).toUpperCase()}
              onLogout={logout}
            />
          </div>
        }
      >
        {children}
      </AppShell>
  );
}
