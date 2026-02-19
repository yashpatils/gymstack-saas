"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
import { SidebarDrawer } from "./SidebarDrawer";
import type { AppNavItem } from "./nav-config";
import { DESKTOP_SIDEBAR_COLLAPSED, DESKTOP_SIDEBAR_EXPANDED, TOPBAR_H } from "./constants";

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
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(TOPBAR_H);

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
    const node = headerRef.current?.querySelector("header");
    if (!(node instanceof HTMLElement) || typeof window === "undefined") {
      return;
    }

    const updateHeaderHeight = () => {
      setHeaderHeight(Math.round(node.getBoundingClientRect().height) || TOPBAR_H);
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(node);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
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
        "--header-h": `${headerHeight}px`,
        "--topbar-h": `${headerHeight}px`,
        "--sidebar-w": `${DESKTOP_SIDEBAR_EXPANDED}px`,
        "--sidebar-collapsed-w": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
      }) as CSSProperties,
    [headerHeight],
  );

  return (
    <div data-testid="app-shell" className={`gs-shell gs-shell--${variant}`} style={shellStyle}>
      <div ref={headerRef} className="gs-shell__header">
        {header({
          onToggleMenu: () => {
            if (!isDesktop) {
              setIsMobileDrawerOpen((current) => !current);
            }
          },
          showMenuToggle: !isDesktop,
        })}
      </div>

      <SidebarDrawer
        items={navItems}
        open={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
      />

      <div className="gs-shell__body" data-sidebar-collapsed={sidebarCollapsed}>
        <SidebarNav
          items={navItems}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
        <main className="gs-shell__main">
          <div className="gs-shell__content">{children}</div>
          {footer ? <div className="gs-shell__footer">{footer}</div> : null}
        </main>
      </div>
    </div>
  );
}
