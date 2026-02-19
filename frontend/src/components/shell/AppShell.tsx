"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
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

  const desktopSidebarWidth = sidebarCollapsed ? DESKTOP_SIDEBAR_COLLAPSED : DESKTOP_SIDEBAR_EXPANDED;

  return (
    <div data-testid="app-shell" className={`gs-shell gs-shell--${variant} min-h-[100dvh] w-full bg-background`} style={shellStyle}>
      <div className="sticky top-0 z-[70] h-[var(--topbar-h)]">
        {header({
          onToggleMenu: () => {
            if (isDesktop) {
              onToggleCollapsed();
              return;
            }

            setIsMobileDrawerOpen((current) => !current);
          },
          showMenuToggle: !isDesktop,
        })}
      </div>

      <div className="relative min-h-[calc(100dvh-var(--topbar-h))]">
        <div
          className={`fixed inset-y-0 left-0 z-20 hidden h-dvh overflow-hidden border-r border-border bg-[var(--surface-sidebar)] lg:block ${sidebarCollapsed ? "w-[var(--sidebar-collapsed-w)]" : "w-[var(--sidebar-w)]"}`}
          style={{ height: "100dvh" }}
          data-sidebar-collapsed={sidebarCollapsed}
        >
          <SidebarNav
            items={navItems}
            title={sidebarTitle}
            subtitle={sidebarSubtitle}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={onToggleCollapsed}
          />
        </div>

        <main className="min-w-0 lg:pl-[var(--sidebar-w)]" style={{ paddingLeft: isDesktop ? desktopSidebarWidth : undefined }}>
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6">{children}</div>
          {footer ? <div className="px-4 pb-6 text-sm text-muted-foreground">{footer}</div> : null}
        </main>
      </div>

      <MobileSidebarDrawer open={!isDesktop && isMobileDrawerOpen} topOffset={TOPBAR_H} onClose={() => setIsMobileDrawerOpen(false)}>
        <SidebarNav
          items={navItems}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          mobileOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          onNavigate={() => setIsMobileDrawerOpen(false)}
        />
      </MobileSidebarDrawer>
    </div>
  );
}
