"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Sidebar, type ShellNavItem } from "./Sidebar";

type TopbarRenderer = (controls: { onToggleMenu: () => void }) => ReactNode;

export function AppShell({ items, topbar, children }: { items: ShellNavItem[]; topbar: TopbarRenderer; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  return (
    <div className="platform-shell">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
      ) : null}
      <Sidebar items={items} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar({ onToggleMenu: () => setMobileNavOpen((value) => !value) })}
        <main className="container-app flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
