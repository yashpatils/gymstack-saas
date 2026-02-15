"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar, type ShellNavItem } from "./Sidebar";

type TopbarRenderer = (controls: { onToggleMenu: () => void }) => ReactNode;

export function AppShell({ items, topbar, children }: { items: ShellNavItem[]; topbar: TopbarRenderer; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="platform-shell">
      <Sidebar items={items} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar({ onToggleMenu: () => setMobileNavOpen((value) => !value) })}
        <main className="container-app flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
