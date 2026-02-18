"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./Sidebar";
import type { AppNavItem } from "./nav-config";
import { DESKTOP_SIDEBAR_COLLAPSED, DESKTOP_SIDEBAR_EXPANDED, TOPBAR_H } from "./constants";

export function ContentContainer({ children }: { children: ReactNode }) {
  return <main className="min-w-0 w-full px-6 py-6 lg:px-8"><div className="mx-auto w-full max-w-[1360px]">{children}</div></main>;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div
      data-testid="app-shell"
      className={`gs-shell shell-${variant} min-h-screen w-full`}
      style={{ "--topbar-h": `${TOPBAR_H}px` } as CSSProperties}
    >
      {header({ onToggleMenu: () => setMobileNavOpen((value) => !value), showMenuToggle: true })}

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-[var(--topbar-h)] z-[50] bg-black/55 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div
        className={`grid min-h-[calc(100vh-var(--topbar-h))] pt-[var(--topbar-h)] ${sidebarCollapsed ? "lg:grid-cols-[var(--sidebar-collapsed)_1fr]" : "lg:grid-cols-[var(--sidebar-expanded)_1fr]"}`}
        style={{
          "--sidebar-expanded": `${DESKTOP_SIDEBAR_EXPANDED}px`,
          "--sidebar-collapsed": `${DESKTOP_SIDEBAR_COLLAPSED}px`,
        } as CSSProperties}
      >
        <SidebarNav
          items={navItems}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="min-w-0 w-full">
          <ContentContainer>{children}</ContentContainer>
          {footer ? <div className="px-4 pb-6 lg:px-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
