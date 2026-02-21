"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { AppNavItem } from "./nav-config";
import SidebarDrawer from "./SidebarDrawer";
import { DesktopSidebar } from "./DesktopSidebar";
import TopBar from "./TopBar";
import { TOPBAR_HEIGHT } from "./shell-constants";

type ShellClientProps = {
  items: AppNavItem[];
  topTitle: string;
  renderTopLeft?: (opts: { toggleMenu: () => void; mobileMenuOpen: boolean }) => React.ReactNode;
  topRight?: React.ReactNode;
  children: React.ReactNode;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
};

export function ShellClient({
  items,
  topTitle,
  renderTopLeft,
  topRight,
  children,
  sidebarTitle,
  sidebarSubtitle,
}: ShellClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const toggleMenu = React.useCallback(() => {
    setMobileOpen((current) => !current);
  }, []);
  const closeMenu = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  React.useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background text-foreground">
      <TopBar
        title={topTitle}
        left={renderTopLeft ? renderTopLeft({ toggleMenu, mobileMenuOpen: mobileOpen }) : null}
        right={topRight}
      />

      <div className="flex min-w-0" style={{ marginTop: TOPBAR_HEIGHT, minHeight: `calc(100dvh - ${TOPBAR_HEIGHT}px)` }}>
        <DesktopSidebar items={items} title={sidebarTitle} subtitle={sidebarSubtitle} />

        <SidebarDrawer
          items={items}
          open={mobileOpen}
          onClose={closeMenu}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            <div className="min-w-0 space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
