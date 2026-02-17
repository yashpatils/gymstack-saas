import type { ReactNode } from "react";
import { PlatformAppShell } from "../../../src/components/platform/layout/PlatformAppShell";
import { locationNavConfigClient, locationNavConfigStaff } from "../../../src/config/nav.config";
import { getLocationSession } from "./_components/location-server-api";
import { NotificationBanner } from "./_components/notification-banner";

const STAFF_ROLES = new Set(["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH"]);

type LayoutProps = {
  children: ReactNode;
};

export default async function LocationLayout({ children }: LayoutProps) {
  const session = await getLocationSession();
  const isStaff = STAFF_ROLES.has(session.role);
  const navItems = isStaff ? locationNavConfigStaff : locationNavConfigClient;

  return (
    <PlatformAppShell
      navItems={navItems}
      mobileBottomNav
      header={{
        leftSlot: <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">Location</span>,
        centerSlot: <span className="text-sm font-semibold">Daily Operations</span>,
        rightSlot: <span className="text-xs text-slate-300">{session.locationId}</span>,
      }}
    >
      <div className="mx-auto w-full max-w-[var(--layout-content-max-width)] space-y-[var(--space-md)] px-[var(--layout-content-padding)] py-[var(--space-lg)] pb-[calc(var(--layout-mobile-nav-height)+var(--space-lg))] md:pb-[var(--space-lg)]">
        <NotificationBanner />
        {children}
      </div>
    </PlatformAppShell>
  );
}
