"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarDrawer } from "./SidebarDrawer";
import { SidebarNav } from "./SidebarNav";
import type { AppNavItem } from "./nav-config";
import {
  DESKTOP_SIDEBAR_COLLAPSED,
  DESKTOP_SIDEBAR_EXPANDED,
  DESKTOP_SIDEBAR_STORAGE_KEY,
  TOPBAR_H,
} from "./constants";

export function AppShell({
  variant,
  navItems,
  sidebarTitle,
  sidebarSubtitle,
  header,
  footer,
  children,
}: {
  variant: "platform" | "admin";
  navItems: AppNavItem[];
  sidebarTitle: string;
  sidebarSubtitle: string;
  header: (controls: { onToggleMenu: () => void; showMenuToggle: boolean }) => ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      const desktop = mediaQuery.matches;
      setIsDesktop(desktop);
      if (desktop) setIsMobileDrawerOpen(false);
    };

    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileDrawerOpen]);

  const shellStyle = useMemo(
    () =>
      ({
        "--topbar-h": `${TOPBAR_H}px`,
        "--sidebar-w": `${DESKTOP_SIDEBAR_EXPANDED}px`,
        "--sidebar-collapsed-w": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
      }) as CSSProperties,
    [],
  );

  const desktopSidebarWidth = sidebarCollapsed
    ? DESKTOP_SIDEBAR_COLLAPSED
    : DESKTOP_SIDEBAR_EXPANDED;

  const onToggleCollapsed = () => {
    setSidebarCollapsed((cur) => {
      const next = !cur;
      window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const onToggleMenu = () => {
    if (isDesktop) onToggleCollapsed();
    else setIsMobileDrawerOpen((v) => !v);
  };

  return (
    <div
      data-testid="app-shell"
      className={`gs-shell gs-shell--${variant} min-h-screen bg-background`}
      style={shellStyle}
    >
      <div className="sticky top-0 z-30 h-[var(--topbar-h)]">
        <div className="mx-auto h-full w-full max-w-[1400px]">
          {header({ onToggleMenu, showMenuToggle: !isDesktop })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside
          className="hidden lg:flex lg:shrink-0 lg:sticky lg:top-[var(--topbar-h)] lg:h-[calc(100vh-var(--topbar-h))]"
          style={{ width: desktopSidebarWidth }}
        >
          <div className="h-full w-full overflow-y-auto border-r border-border/60 bg-background/40 backdrop-blur-xl">
            <SidebarNav
              items={navItems}
              collapsed={sidebarCollapsed}
              title={sidebarTitle}
              subtitle={sidebarSubtitle}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          {children}
          {footer ? <div className="mt-8">{footer}</div> : null}
        </main>
      </div>

      <SidebarDrawer
        open={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        items={navItems}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
      />
    </div>
  );
}
