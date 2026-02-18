"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SidebarNav } from "./Sidebar";
import type { AppNavItem } from "./nav-config";

export function ContentContainer({ children }: { children: ReactNode }) {
  return <main className="container-app flex-1 py-6">{children}</main>;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(112);
  const headerHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    const element = headerHostRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextHeight = Math.round(entries[0]?.contentRect.height ?? 0);
      if (nextHeight > 0) {
        setHeaderHeight(nextHeight);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`platform-shell shell-${variant}`}
      style={{ "--platform-header-height": `${headerHeight}px` } as CSSProperties}
    >
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
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
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={headerHostRef}>
          {header({ onToggleMenu: () => setMobileNavOpen((value) => !value), showMenuToggle: true })}
        </div>
        <ContentContainer>{children}</ContentContainer>
        {footer ? <div className="container-app pb-6">{footer}</div> : null}
      </div>
    </div>
  );
}
