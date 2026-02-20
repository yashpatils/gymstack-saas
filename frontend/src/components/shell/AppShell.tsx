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

  const desktopSidebarWidth = sidebarCollapsed
    ? DESKTOP_SIDEBAR_COLLAPSED
    : DESKTOP_SIDEBAR_EXPANDED;

  const shellStyle = useMemo(
    () =>
      ({
        "--topbar-h": `${TOPBAR_H}px`,
        "--sidebar-w": `${desktopSidebarWidth}px`,
        "--sidebar-collapsed-w": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
      }) as CSSProperties,
    [desktopSidebarWidth],
  );

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
      <div className="fixed inset-x-0 top-0 z-50 h-[var(--topbar-h)]">
        <div className="mx-auto h-full w-full max-w-[1400px]">
          {header({ onToggleMenu, showMenuToggle: !isDesktop })}
        </div>
      </div>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[var(--sidebar-w)] pt-[var(--topbar-h)] lg:block">
        <SidebarNav
          items={navItems}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={onToggleCollapsed}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
        />
      </aside>

      <main key={pathname} className="min-w-0 pt-[var(--topbar-h)] lg:pl-[var(--sidebar-w)]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">
          {children}
          {footer ? <div className="mt-8">{footer}</div> : null}
        </div>
      </main>

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
