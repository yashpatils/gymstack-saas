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
      className="sidebar-sheen hidden lg:flex lg:w-[296px] lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card/70 lg:backdrop-blur-xl lg:shadow-lg"
      style={{
        width: DESKTOP_SIDEBAR_WIDTH,
        height: `calc(100dvh - ${TOPBAR_HEIGHT}px)`,
        position: "sticky",
        top: TOPBAR_HEIGHT,
      }}
    >
      <SidebarNav items={items} title={title} subtitle={subtitle} className="h-full" />
    </aside>
  );
}
