"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { RequireAuth } from "../../src/components/RequireAuth";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { Topbar } from "../../src/components/shell/Topbar";

const navItems = [
  { label: "Overview", href: "/platform" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Team", href: "/platform/team" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Coach", href: "/platform/coach" },
  { label: "Client", href: "/platform/client" },
  { label: "Settings", href: "/platform/settings" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout, permissions, memberships, activeContext } = useAuth();

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = email.split("@")[0] ?? "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email]);

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading workspace...</main>;
  }

  const filteredItems = navItems.filter((item) => {
    if (item.href === "/platform/billing") {
      return permissions.includes("billing:manage") || user?.role === "OWNER" || user?.role === "ADMIN";
    }

    if (item.href === "/platform/team") {
      return permissions.some((permission) => ["users:crud", "staff:crud", "tenant:manage"].includes(permission));
    }

    return true;
  });

  return (
    <RequireAuth>
      <AppShell
        pathname={pathname}
        items={filteredItems}
        topbar={
          <Topbar
            email={email}
            orgName={activeContext?.tenantId ?? "GymStack"}
            initials={initials}
            memberships={memberships}
            selectedTenantId={activeContext?.tenantId ?? ""}
            onLogout={logout}
          />
        }
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
