"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "../../src/components/AuthGate";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppShell } from "../../src/components/shell/AppShell";
import { Topbar } from "../../src/components/shell/Topbar";
import { apiFetch } from "../../src/lib/apiFetch";

const baseNavItems = [
  { label: "Overview", href: "/platform" },
  { label: "Gyms", href: "/platform/gyms" },
  { label: "Team", href: "/platform/team" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Coach", href: "/platform/coach" },
  { label: "Client", href: "/platform/client" },
  { label: "Settings", href: "/platform/settings" },
];

type LocationBranding = {
  customDomain?: string | null;
  gymName: string;
  logoUrl?: string | null;
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, permissions, memberships, activeContext, onboarding, ownerOperatorSettings, activeMode, switchMode, chooseContext, platformRole } = useAuth();
  const [locationBranding, setLocationBranding] = useState<LocationBranding | null>(null);

  const email = user?.email ?? "platform.user@gymstack.app";
  const initials = useMemo(() => {
    const source = (user?.name?.trim() || email.split("@")[0] || "PU");
    return source.slice(0, 2).toUpperCase();
  }, [email, user?.name]);

  useEffect(() => {
    if (!loading && onboarding?.needsOpsChoice && pathname !== "/platform/onboarding") {
      router.replace("/platform/onboarding");
    }
  }, [loading, onboarding?.needsOpsChoice, pathname, router]);

  useEffect(() => {
    let mounted = true;

    async function loadLocationBranding() {
      const locationId = activeContext?.locationId;
      const role = activeContext?.role;
      if (!locationId || role === "TENANT_OWNER") {
        setLocationBranding(null);
        return;
      }

      try {
        const branding = await apiFetch<LocationBranding>(`/api/locations/${locationId}/branding`, { method: "GET" });
        if (mounted) {
          setLocationBranding(branding);
        }
      } catch {
        if (mounted) {
          setLocationBranding(null);
        }
      }
    }

    void loadLocationBranding();

    return () => {
      mounted = false;
    };
  }, [activeContext?.locationId, activeContext?.role]);

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
  const isTenantOwner = activeContext?.role === "TENANT_OWNER";
  const companyName = user?.name ?? "Your Company";
  const staffOrClient = activeContext?.role === "GYM_STAFF_COACH" || activeContext?.role === "CLIENT";

  const footer = isTenantOwner ? (
    <footer className="platform-footer">
      <div>
        <p className="text-sm font-medium text-slate-100">{companyName}</p>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GymStack. All rights reserved.</p>
      </div>
      <div className="platform-footer-links">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/platform/support">Support</Link>
        <Link href="/contact">Contact</Link>
      </div>
    </footer>
  ) : staffOrClient ? (
    locationBranding?.customDomain ? null : (
      <footer className="platform-footer platform-footer-minimal">
        <p>Powered by GymStack</p>
      </footer>
    )
  ) : null;

  return (
    <AuthGate>
      <AppShell
        items={filteredItems}
        topbar={({ onToggleMenu }) => (
          <Topbar
            initials={initials}
            displayName={user?.name?.trim() || email}
            tenantName={companyName}
            isTenantOwner={isTenantOwner}
            memberships={memberships}
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
          {footer ? <div className="container-app pb-6">{footer}</div> : null}
        </>
      </AppShell>
    </AuthGate>
  );
}
