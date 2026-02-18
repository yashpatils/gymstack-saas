"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./Sidebar";
import type { AppNavItem } from "./nav-config";

export function ContentContainer({ children }: { children: ReactNode }) {
  return <main className="flex-1 min-w-0 px-4 py-4 lg:px-8 lg:py-6">{children}</main>;
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
  const [headerHeight, setHeaderHeight] = useState(112);
  const headerHostRef = useRef<HTMLDivElement | null>(null);

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
      className={`platform-shell shell-${variant} ${sidebarCollapsed ? "platform-shell-collapsed" : ""}`}
      style={{ "--platform-header-height": `${headerHeight}px` } as CSSProperties}
    >
      {mobileNavOpen ? (
        <button
          type="button"
          className="platform-sidebar-backdrop fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
      ) : null}
      <SidebarNav
        items={navItems}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="platform-content-column flex min-w-0 flex-1 flex-col">
        <div ref={headerHostRef}>
          {header({ onToggleMenu: () => setMobileNavOpen((value) => !value), showMenuToggle: true })}
        </div>
        <ContentContainer>{children}</ContentContainer>
        {footer ? <div className="px-4 pb-6 lg:px-8">{footer}</div> : null}
      </div>
    </div>
  );
}
