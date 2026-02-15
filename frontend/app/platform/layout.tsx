"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "../../src/components/AuthGate";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { Topbar } from "../../src/components/shell/Topbar";
import { AppFooter } from "../../src/components/shell/AppFooter";

const baseNavItems = [
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
  const router = useRouter();
  const { user, loading, logout, permissions, activeContext, onboarding, ownerOperatorSettings, activeMode, switchMode, chooseContext, platformRole } = useAuth();

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = user?.name?.trim() || email.split("@")[0] || "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email, user?.name]);

  useEffect(() => {
    if (!loading && onboarding?.needsOpsChoice && pathname !== "/platform/onboarding") {
      router.replace("/platform/onboarding");
    }
  }, [loading, onboarding?.needsOpsChoice, pathname, router]);

  const handleSwitchMode = useCallback(async (mode: "OWNER" | "MANAGER") => {
    const tenantId = activeContext?.tenantId;
    if (!tenantId) {
      return;
    }

    const locationId = activeContext?.locationId ?? ownerOperatorSettings?.defaultLocationId ?? undefined;
    await switchMode(tenantId, mode, mode === "MANAGER" ? locationId ?? undefined : undefined);
    await chooseContext(tenantId, mode === "MANAGER" ? locationId ?? undefined : undefined);
    await router.push("/platform");
  }, [activeContext?.locationId, activeContext?.tenantId, chooseContext, ownerOperatorSettings?.defaultLocationId, router, switchMode]);

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading workspace...</main>;
  }

  const navItems = platformRole === "PLATFORM_ADMIN"
    ? [...baseNavItems, { label: "Admin", href: "/admin" }]
    : baseNavItems;

  const filteredItems = navItems.filter((item) => {
    if (item.href === "/platform/billing") {
      return permissions.includes("billing:manage") || user?.role === "OWNER" || user?.role === "ADMIN";
    }

    if (item.href === "/platform/team") {
      return permissions.some((permission) => ["users:crud", "staff:crud", "tenant:manage"].includes(permission));
    }

    return true;
  });

  const canSwitchMode = Boolean(ownerOperatorSettings?.allowOwnerStaffLogin || ownerOperatorSettings?.defaultMode === "MANAGER");

  return (
    <AuthGate>
      <AppShell
        items={filteredItems}
        topbar={({ onToggleMenu }) => (
          <Topbar
            initials={initials}
            displayName={user?.name?.trim() || email}
            onLogout={logout}
            canSwitchMode={canSwitchMode}
            activeMode={activeMode}
            onSwitchMode={(mode) => {
              void handleSwitchMode(mode);
            }}
            onToggleMenu={onToggleMenu}
          />
        )}
      >
        <>
          {children}
          <div className="container-app pb-6">
            <AppFooter />
          </div>
        </>
      </AppShell>
    </AuthGate>
  );
}
