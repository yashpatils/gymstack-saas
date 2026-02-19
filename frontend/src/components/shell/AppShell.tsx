"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./Sidebar";
import type { AppNavItem } from "./nav-config";
import { DESKTOP_SIDEBAR_COLLAPSED, DESKTOP_SIDEBAR_EXPANDED, TOPBAR_H } from "./constants";

export function ContentContainer({ children }: { children: ReactNode }) {
  return (
    <main className="w-full min-w-0 px-6 py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">{children}</div>
    </main>
  );
}

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
        "--topbar-h": `${TOPBAR_H}px`,
        "--sidebar-expanded": `${DESKTOP_SIDEBAR_EXPANDED}px`,
        "--sidebar-collapsed": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
      }) as CSSProperties,
    [],
  );

  return (
    <div data-testid="app-shell" className={`gs-shell shell-${variant} min-h-screen w-full`} style={shellStyle}>
      {header({
        onToggleMenu: () => {
          if (isDesktop) {
            return;
          }
          setIsMobileDrawerOpen((current) => !current);
        },
        showMenuToggle: !isDesktop,
      })}

      {isMobileDrawerOpen ? (
        <button
          type="button"
          data-testid="mobile-drawer-backdrop"
          aria-label="Close menu overlay"
          className="fixed inset-0 top-[var(--topbar-h)] z-[50] bg-black/60 lg:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      ) : null}

      <div
        className={`grid min-h-[calc(100vh-var(--topbar-h))] pt-[var(--topbar-h)] ${
          sidebarCollapsed ? "lg:grid-cols-[var(--sidebar-collapsed)_1fr]" : "lg:grid-cols-[var(--sidebar-expanded)_1fr]"
        }`}
      >
        <SidebarNav
          items={navItems}
          mobileOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="w-full min-w-0">
          <ContentContainer>{children}</ContentContainer>
          {footer ? <div className="px-4 pb-6 lg:px-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
