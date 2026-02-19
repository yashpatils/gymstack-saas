"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";
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
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const applyMatch = () => {
      const desktop = mediaQuery.matches;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileDrawerOpen(false);
      }
    };

    applyMatch();
    mediaQuery.addEventListener("change", applyMatch);
    return () => mediaQuery.removeEventListener("change", applyMatch);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    if (stored === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [isMobileDrawerOpen]);

  const shellStyle = useMemo(
    () =>
      ({
        "--header-h": `${TOPBAR_H}px`,
        "--topbar-h": `${TOPBAR_H}px`,
        "--sidebar-w": `${DESKTOP_SIDEBAR_EXPANDED}px`,
        "--sidebar-collapsed-w": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
      }) as CSSProperties,
    [],
  );

  const onToggleCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  return (
    <div data-testid="app-shell" className={`gs-shell gs-shell--${variant} min-h-screen`} style={shellStyle}>
      <div className="fixed inset-x-0 top-0 z-[60] h-[var(--topbar-h)]">
        {header({
          onToggleMenu: () => {
            if (isDesktop) {
              onToggleCollapsed();
              return;
            }

            setIsMobileDrawerOpen((current) => !current);
          },
          showMenuToggle: true,
        })}
      </div>

      <div className="pt-[var(--topbar-h)]">
        <div className="flex h-[calc(100vh-var(--topbar-h))]">
          <div
            className={`hidden shrink-0 border-r border-border/60 lg:block ${sidebarCollapsed ? "w-[var(--sidebar-collapsed-w)]" : "w-[var(--sidebar-w)]"}`}
            data-sidebar-collapsed={sidebarCollapsed}
          >
            <Sidebar
              items={navItems}
              title={sidebarTitle}
              subtitle={sidebarSubtitle}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={onToggleCollapsed}
            />
          </div>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6">{children}</div>
            {footer ? <div className="px-4 pb-6">{footer}</div> : null}
          </main>
        </div>
      </div>

      <MobileSidebarDrawer open={!isDesktop && isMobileDrawerOpen} topOffset={TOPBAR_H} onClose={() => setIsMobileDrawerOpen(false)}>
        <Sidebar
          items={navItems}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          mobileOpen
          onClose={() => setIsMobileDrawerOpen(false)}
          onNavigate={() => setIsMobileDrawerOpen(false)}
        />
      </MobileSidebarDrawer>
    </div>
  );
}
