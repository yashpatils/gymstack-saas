"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

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
    <div className={`platform-shell shell-${variant}`}>
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 z-30 bg-black/50 lg:hidden"
          style={{ top: "var(--topbar-h)" }}
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
        collapsed={desktopSidebarCollapsed}
        onToggleCollapsed={() => setDesktopSidebarCollapsed((current) => !current)}
      />
      <div className="flex min-w-0 flex-1 flex-col pt-[var(--topbar-h)]">
        {header({ onToggleMenu: () => setMobileNavOpen((value) => !value), showMenuToggle: true })}
        <ContentContainer>{children}</ContentContainer>
        {footer ? <div className="px-4 pb-6 lg:px-8">{footer}</div> : null}
      </div>
    </div>
  );
}
