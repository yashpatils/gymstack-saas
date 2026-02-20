"use client";

import * as React from "react";
import TopBar from "./TopBar";
import SidebarNav from "./SidebarNav";
import SidebarDrawer from "./SidebarDrawer";
import type { AppNavItem } from "./nav-config";
import { DESKTOP_SIDEBAR_W, TOPBAR_H } from "./constants";

type AppShellProps = {
  items: AppNavItem[];
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function AppShell({
  items,
  title,
  subtitle,
  rightSlot,
  leftSlot,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <TopBar
        title={title}
        rightSlot={rightSlot}
        leftSlot={leftSlot}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />

      <aside
        className="fixed left-0 top-0 hidden h-dvh border-r border-border bg-background/70 backdrop-blur-xl lg:block"
        style={{ width: DESKTOP_SIDEBAR_W }}
      >
        <div style={{ paddingTop: TOPBAR_H, height: "100%" }} className="overflow-hidden">
          <div className="h-full overflow-y-auto">
            <SidebarNav items={items} title="Platform" subtitle={subtitle} />
          </div>
        </div>
      </aside>

      <SidebarDrawer
        items={items}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Platform"
        subtitle={subtitle}
      />

      <main style={{ paddingTop: TOPBAR_H }}>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="lg:pl-[288px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
