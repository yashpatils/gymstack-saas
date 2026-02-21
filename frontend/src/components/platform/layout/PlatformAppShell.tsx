"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { NavItemConfig } from "../../../config/nav.config";
import { PlatformHeader } from "./PlatformHeader";

type PlatformAppShellProps = {
  navItems: NavItemConfig[];
  header: {
    leftSlot?: ReactNode;
    centerSlot?: ReactNode;
    rightSlot?: ReactNode;
  };
  children: ReactNode;
  rightPanel?: ReactNode;
  footer?: ReactNode;
  mobileBottomNav?: boolean;
};

export function PlatformAppShell({ navItems, header, children, rightPanel, footer, mobileBottomNav = false }: PlatformAppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PlatformHeader
        leftSlot={(
          <>
            <button
              type="button"
              onClick={() => setMobileNavOpen((value) => !value)}
              className="button secondary lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
              aria-controls="platform-sidebar-drawer"
            >
              ☰
            </button>
            {header.leftSlot}
          </>
        )}
        centerSlot={header.centerSlot}
        rightSlot={header.rightSlot}
      />

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-x-0 bottom-0 top-[var(--layout-header-platform)] z-20 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="mx-auto grid w-full max-w-[var(--layout-content-max-width)] grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_320px]">
        <aside
          id="platform-sidebar-drawer"
          className={`fixed left-0 top-[var(--layout-header-platform)] z-30 h-[calc(100dvh-var(--layout-header-platform))] w-[280px] shrink-0 overflow-y-auto border-r border-border bg-card/80 backdrop-blur-xl shadow-xl p-[var(--space-md)] transition-transform duration-200 lg:sticky lg:block lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <nav className="space-y-[var(--space-xs)]" aria-label="Platform navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`block rounded-[var(--radius-md)] px-[var(--space-md)] py-[var(--space-sm)] text-sm ${active ? "bg-primary text-primary-foreground hover:bg-primary" : "text-foreground hover:bg-muted"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 pb-[var(--space-xl)] lg:col-start-2 xl:col-start-2">
          {children}
          {footer ? <footer className="px-[var(--layout-content-padding)] py-[var(--space-md)] text-xs text-muted-foreground">{footer}</footer> : null}
        </div>

        {rightPanel ? <aside className="hidden border-l border-border p-[var(--space-md)] xl:block">{rightPanel}</aside> : null}
      </div>

      {mobileBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-[var(--z-overlay)] grid h-[var(--layout-mobile-nav-height)] grid-cols-3 gap-[var(--space-xs)] border-t border-border bg-card/95 p-[var(--space-sm)] backdrop-blur-xl md:hidden">
          {navItems.slice(0, 3).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[var(--radius-md)] border px-[var(--space-sm)] py-[var(--space-xs)] text-center text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
