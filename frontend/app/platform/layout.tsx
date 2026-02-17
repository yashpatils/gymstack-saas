"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "../../src/components/AuthGate";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { Topbar } from "../../src/components/shell/Topbar";
import { AppFooter } from "../../src/components/shell/AppFooter";
import { EmailVerificationBanner } from "../components/email-verification-banner";
import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../src/lib/adminPortal";
import { listGyms } from "../../src/lib/gyms";
import type { LocationOption } from "../../src/types/auth";

const baseNavItems = [
  { label: "Overview", href: "/platform" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Team", href: "/platform/team" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Coach", href: "/platform/coach" },
  { label: "Client", href: "/platform/client" },
  { label: "Insights", href: "/platform/insights" },
  { label: "Settings", href: "/platform/settings" },
  { label: "Location settings", href: "/platform/locations/settings" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, permissions, permissionKeys, activeContext, onboarding, ownerOperatorSettings, activeMode, switchMode, chooseContext, platformRole, memberships } = useAuth();
  const [locations, setLocations] = useState<LocationOption[]>([]);

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

  const hasOwnerMembership = memberships.some((membership) => membership.role === "TENANT_OWNER");
  const hasManagerMembership = memberships.some((membership) => membership.role === "TENANT_LOCATION_ADMIN");
  const canShowLocationSwitcher = hasOwnerMembership || activeContext?.role === "TENANT_LOCATION_ADMIN";

  useEffect(() => {
    if (!canShowLocationSwitcher) {
      setLocations([]);
      return;
    }

    let mounted = true;
    void listGyms().then((gyms) => {
      if (!mounted) {
        return;
      }
      setLocations(gyms.map((gym) => ({ id: gym.id, displayName: gym.name, slug: gym.id })));
    }).catch(() => {
      if (mounted) {
        setLocations([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, [canShowLocationSwitcher]);

  const handleSwitchMode = useCallback(async (mode: "OWNER" | "MANAGER") => {
    const tenantId = activeContext?.tenantId;
    if (!tenantId) {
      return;
    }

    const fallbackLocationId = activeContext?.locationId ?? ownerOperatorSettings?.defaultLocationId ?? locations[0]?.id;
    if (mode === "MANAGER" && !fallbackLocationId) {
      return;
    }

    await switchMode(tenantId, mode, mode === "MANAGER" ? fallbackLocationId ?? undefined : undefined);
    await router.refresh();
  }, [activeContext?.locationId, activeContext?.tenantId, locations, ownerOperatorSettings?.defaultLocationId, router, switchMode]);

  const handleSelectLocation = useCallback(async (locationId: string | null) => {
    const tenantId = activeContext?.tenantId;
    if (!tenantId) {
      return;
    }

    const nextMode = locationId ? "MANAGER" : "OWNER";
    await chooseContext(tenantId, locationId ?? undefined, nextMode);
    await router.refresh();
  }, [activeContext?.tenantId, chooseContext, router]);

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading workspace...</main>;
  }

  const navItems = platformRole === "PLATFORM_ADMIN"
    ? [...baseNavItems, { label: "Admin", href: ADMIN_PORTAL_FRESH_LOGIN_URL }]
    : baseNavItems;

  const canManageTenantSettings = permissions.canManageTenant
    || permissionKeys.includes("tenant:manage")
    || user?.role === "OWNER"
    || user?.role === "ADMIN";

  const canManageLocationSettings = activeContext?.role === "TENANT_OWNER"
    || activeContext?.role === "TENANT_LOCATION_ADMIN";

  const filteredItems = navItems.filter((item) => {
    if (item.href === "/platform/billing") {
      return permissions.canManageBilling || permissionKeys.includes("billing:manage") || user?.role === "OWNER" || user?.role === "ADMIN";
    }

    if (item.href === "/platform/team") {
      return permissions.canManageUsers || permissions.canManageTenant || permissionKeys.some((permission) => ["users:crud", "staff:crud", "tenant:manage"].includes(permission));
    }

    if (item.href === "/platform/settings") {
      return canManageTenantSettings;
    }

    if (item.href === "/platform/locations/settings") {
      return canManageLocationSettings;
    }

    return true;
  });

  const canSwitchMode = Boolean(hasOwnerMembership && hasManagerMembership);

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
            activeMode={activeMode ?? "OWNER"}
            onSwitchMode={(mode) => {
              void handleSwitchMode(mode);
            }}
            onToggleMenu={onToggleMenu}
            showAdminPortalLink={platformRole === "PLATFORM_ADMIN"}
            canShowLocationSwitcher={canShowLocationSwitcher}
            locations={locations}
            activeLocationId={activeContext?.locationId}
            onSelectLocation={handleSelectLocation}
          />
        )}
      >
        <>
          <div className="container-app pt-4"><EmailVerificationBanner /></div>
          {children}
          <div className="container-app pb-6">
            <AppFooter />
          </div>
        </>
      </AppShell>
    </AuthGate>
  );
}
