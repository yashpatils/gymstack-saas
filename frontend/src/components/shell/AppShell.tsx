"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Sidebar, type ShellNavItem } from "./Sidebar";

export function AppShell({
  pathname,
  items,
  topbar,
  footer,
  children,
}: {
  pathname: string;
  items: ShellNavItem[];
  topbar: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="platform-shell">
      {mobileNavOpen ? <button type="button" aria-label="Close menu" className="platform-sidebar-scrim" onClick={() => setMobileNavOpen(false)} /> : null}
      <Sidebar items={items} pathname={pathname} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="platform-mobile-nav">
          <button type="button" className="button secondary" onClick={() => setMobileNavOpen((value) => !value)}>
            {mobileNavOpen ? "Close menu" : "Menu"}
          </button>
        </div>
        {topbar}
        <main className="container-app flex-1 py-6">{children}</main>
        {footer ? <div className="container-app pb-6">{footer}</div> : null}
      </div>
    </div>
  );
}
