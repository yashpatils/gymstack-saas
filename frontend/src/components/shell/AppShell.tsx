"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar, type ShellNavItem } from "./Sidebar";

export function AppShell({ pathname, items, topbar, children }: { pathname: string; items: ShellNavItem[]; topbar: ReactNode; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="platform-shell">
      <Sidebar items={items} pathname={pathname} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="platform-mobile-nav">
          <button type="button" className="button secondary" onClick={() => setMobileNavOpen((value) => !value)}>
            {mobileNavOpen ? "Close menu" : "Menu"}
          </button>
        </div>
        {topbar}
        <main className="container-app flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
