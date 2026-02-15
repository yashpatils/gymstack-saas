"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "../../src/components/AuthGate";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { Topbar } from "../../src/components/shell/Topbar";

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
  const { user, loading, logout, permissions, memberships, activeContext, onboarding, ownerOperatorSettings, activeMode, switchMode, chooseContext, platformRole } = useAuth();
  const [hasGymstackHost, setHasGymstackHost] = useState(true);

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = email.split("@")[0] ?? "PU";
    return source.slice(0, 2).toUpperCase();
  }, [email]);

  useEffect(() => {
    if (!loading && onboarding?.needsOpsChoice && pathname !== "/platform/onboarding") {
      router.replace("/platform/onboarding");
    }
  }, [loading, onboarding?.needsOpsChoice, pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setHasGymstackHost(window.location.hostname.includes("gymstack"));
  }, []);

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

  const navItems = platformRole === 'PLATFORM_ADMIN'
    ? [...baseNavItems, { label: 'Admin', href: '/admin' }]
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
  const isTenantOwner = activeContext?.role === "TENANT_OWNER";
  const companyName = user?.name ?? activeContext?.tenantId ?? "Your Company";

  const footer = isTenantOwner ? (
    <footer className="platform-footer">
      <p>Owner Console • {companyName}</p>
      <p className="text-muted-foreground">Need billing or domain help? Visit support from Billing or Settings.</p>
    </footer>
  ) : hasGymstackHost ? (
    <footer className="platform-footer platform-footer-minimal">
      <p>Powered by GymStack</p>
    </footer>
  ) : null;

  return (
    <AuthGate>
      <AppShell
        pathname={pathname}
        items={filteredItems}
        topbar={
          <Topbar
            initials={initials}
            memberships={memberships}
            onLogout={logout}
            canSwitchMode={canSwitchMode}
            activeMode={activeMode}
            onSwitchMode={(mode) => {
              void handleSwitchMode(mode);
            }}
          />
        }
      >
        <>
          {children}
          {footer ? <div className="container-app pb-6">{footer}</div> : null}
        </>
      </AppShell>
    </AuthGate>
  );
}
