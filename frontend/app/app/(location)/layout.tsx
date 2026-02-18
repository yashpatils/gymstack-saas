import type { ReactNode } from "react";
import { locationNavConfigClient, locationNavConfigStaff } from "../../../src/config/nav.config";
import { getLocationSession } from "./_components/location-server-api";
import { LocationAppShell } from "./_components/location-app-shell";
import { NotificationBanner } from "./_components/notification-banner";

const STAFF_ROLES = new Set(["TENANT_LOCATION_ADMIN", "GYM_STAFF_COACH"]);

type LayoutProps = {
  children: ReactNode;
};

export default async function LocationLayout({ children }: LayoutProps) {
  const session = await getLocationSession();
  const isStaff = STAFF_ROLES.has(session.role);
  const navItems = isStaff ? locationNavConfigStaff : locationNavConfigClient;
  const accountName = session.auth.user.name?.trim() || session.auth.user.email;
  const accountInitials = accountName.slice(0, 2).toUpperCase();

  return (
    <LocationAppShell
      navItems={navItems}
      locationId={session.locationId}
      accountName={accountName}
      accountInitials={accountInitials}
    >
      <div className="mx-auto w-full max-w-[var(--layout-content-max-width)] space-y-[var(--space-md)] px-[var(--layout-content-padding)] py-[var(--space-lg)] pb-[calc(var(--layout-mobile-nav-height)+var(--space-lg))] md:pb-[var(--space-lg)]">
        <NotificationBanner />
        {children}
      </div>
    </LocationAppShell>
  );
}
