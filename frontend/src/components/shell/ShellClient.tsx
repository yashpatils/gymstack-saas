"use client";

import * as React from "react";
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const toggleMenu = React.useCallback(() => {
    setMobileOpen((current) => !current);
  }, []);
  const closeMenu = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title={topTitle}
        left={renderTopLeft ? renderTopLeft({ toggleMenu, mobileMenuOpen: mobileOpen }) : null}
        right={topRight}
      />

      <DesktopSidebar items={items} title={sidebarTitle} subtitle={sidebarSubtitle} />

      <SidebarDrawer
        items={items}
        open={mobileOpen}
        onClose={closeMenu}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
      />

      <main style={{ paddingTop: 12, minHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}>
        <div className="mx-auto max-w-[1600px] lg:pl-[296px]">
          <div className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-6 space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
