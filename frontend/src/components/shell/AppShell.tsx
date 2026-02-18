"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./Sidebar";
import type { AppNavItem } from "./nav-config";

export const TOPBAR_H = 64;

export function ContentContainer({ children }: { children: ReactNode }) {
  return <main className="min-w-0 w-full px-4 py-4 lg:px-8 lg:py-6"><div className="mx-auto w-full max-w-[1400px]">{children}</div></main>;
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
          className="fixed inset-0 top-[var(--topbar-h)] z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div
        className={`grid min-h-[calc(100vh-var(--topbar-h))] pt-[var(--topbar-h)] lg:grid-cols-[288px_1fr] ${sidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : ""}`}
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
