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
  renderTopLeft?: (opts: { openMenu: () => void }) => React.ReactNode;
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
  const openMenu = React.useCallback(() => setMobileOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={topTitle} left={renderTopLeft ? renderTopLeft({ openMenu }) : null} right={topRight} />

      <DesktopSidebar items={items} title={sidebarTitle} subtitle={sidebarSubtitle} />

      <SidebarDrawer
        items={items}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
      />

      <main style={{ paddingTop: 12, minHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}>
        <div className="mx-auto max-w-[1600px] px-4 pb-8">
          <div className="lg:pl-[296px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
