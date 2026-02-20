"use client";

import type { AppNavItem } from "./nav-config";
import { SidebarNav } from "./SidebarNav";
import { DESKTOP_SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "./shell-constants";

type DesktopSidebarProps = {
  items: AppNavItem[];
  title?: string;
  subtitle?: string;
};

export function DesktopSidebar({ items, title, subtitle }: DesktopSidebarProps) {
  return (
    <aside
      className="sidebar-sheen hidden lg:fixed lg:left-0 lg:z-30 lg:block lg:border-r lg:border-border lg:bg-card/70 lg:backdrop-blur-xl lg:shadow-lg"
      style={{
        top: 0,
        height: "100vh",
        width: DESKTOP_SIDEBAR_WIDTH,
        paddingTop: TOPBAR_HEIGHT,
      }}
    >
      <SidebarNav items={items} title={title} subtitle={subtitle} className="h-full" />
    </aside>
  );
}
