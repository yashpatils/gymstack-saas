"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "../../src/components/AuthGate";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { AppHeader } from "../../src/components/shell/AppHeader";
import { AppFooter } from "../../src/components/shell/AppFooter";
import { EmailVerificationBanner } from "../components/email-verification-banner";
import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../src/lib/adminPortal";
import { listGyms } from "../../src/lib/gyms";
import type { LocationOption } from "../../src/types/auth";
import { ModeToggle } from "../../src/components/shell/ModeToggle";
import { LocationSwitcher } from "../../src/components/shell/LocationSwitcher";
import { platformNavItems } from "../../src/components/shell/nav-config";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, permissions, permissionKeys, activeContext, onboarding, ownerOperatorSettings, activeMode, switchMode, chooseContext, platformRole, memberships, activeTenant } = useAuth();
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

  const canManageTenantSettings = permissions.canManageTenant
    || permissionKeys.includes("tenant:manage")
    || user?.role === "OWNER"
    || user?.role === "ADMIN";

  const canManageLocationSettings = activeContext?.role === "TENANT_OWNER"
    || activeContext?.role === "TENANT_LOCATION_ADMIN";

  const canSendFeedback = activeContext?.role === "TENANT_OWNER"
    || activeContext?.role === "TENANT_LOCATION_ADMIN"
    || activeContext?.role === "GYM_STAFF_COACH";

  const filteredItems = platformNavItems.filter((item) => {
    if (item.requiresRole === "PLATFORM_ADMIN" && platformRole !== "PLATFORM_ADMIN") {
      return false;
    }
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
        variant="platform"
        navItems={filteredItems}
        sidebarTitle="Platform"
        sidebarSubtitle="Operations Console"
        footer={<AppFooter />}
        header={({ onToggleMenu, showMenuToggle }) => (
          <AppHeader
            onToggleMenu={onToggleMenu}
            showMenuToggle={showMenuToggle}
            accountInitials={initials}
            accountName={user?.name?.trim() || email}
            onLogout={logout}
            accountLinks={[
              { href: "/platform/account", label: "Account info" },
              { href: "/platform/settings", label: "Settings" },
              ...(platformRole === "PLATFORM_ADMIN" ? [{ href: ADMIN_PORTAL_FRESH_LOGIN_URL, label: "Admin portal" }] : []),
            ]}
            leftExtra={canShowLocationSwitcher ? (
              <div className="hidden md:block">
                <LocationSwitcher locations={locations} activeLocationId={activeContext?.locationId} activeMode={activeMode ?? "OWNER"} onSelect={handleSelectLocation} canCreate />
              </div>
            ) : undefined}
            centerContent={canSwitchMode ? (
              <ModeToggle
                activeMode={activeMode ?? "OWNER"}
                onSwitchMode={(mode) => {
                  void handleSwitchMode(mode);
                }}
              />
            ) : <p className="text-sm text-muted-foreground">Workspace</p>}
          />
        )}
      >
        <>
          <div className="container-app pt-4"><EmailVerificationBanner /></div>
          {activeTenant?.isDemo ? <div className="container-app"><div className="rounded border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">Demo mode — data resets daily</div></div> : null}
          {children}
          {canSendFeedback ? (
            <div className="container-app pb-2 text-right">
              <a href="/platform/feedback" className="button secondary">Send feedback</a>
            </div>
          ) : null}
        </>
      </AppShell>
    </AuthGate>
  );
}
