"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PlatformHeader
        leftSlot={(
          <>
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="button secondary">
              ☰
            </button>
            {header.leftSlot}
          </>
        )}
        centerSlot={header.centerSlot}
        rightSlot={header.rightSlot}
      />

      <div className="mx-auto flex w-full max-w-[var(--layout-content-max-width)]">
        <aside className={`${collapsed ? "w-[var(--layout-sidebar-collapsed)]" : "w-[var(--layout-sidebar-expanded)]"} hidden min-h-[calc(100vh-var(--layout-header-platform))] border-r border-white/10 p-[var(--space-md)] transition-[width] duration-200 md:block`}>
          <nav className="space-y-[var(--space-xs)]">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`block rounded-[var(--radius-md)] px-[var(--space-md)] py-[var(--space-sm)] text-sm ${active ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}>
                  {collapsed ? item.label.slice(0, 1) : item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-[var(--space-xl)]">
          {children}
          {footer ? <footer className="px-[var(--layout-content-padding)] py-[var(--space-md)] text-xs text-muted-foreground">{footer}</footer> : null}
        </div>

        {rightPanel ? <aside className="hidden w-80 border-l border-white/10 p-[var(--space-md)] xl:block">{rightPanel}</aside> : null}
      </div>

      {mobileBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-[var(--z-overlay)] grid h-[var(--layout-mobile-nav-height)] grid-cols-3 gap-[var(--space-xs)] border-t border-white/10 bg-slate-900/95 p-[var(--space-sm)] md:hidden">
          {navItems.slice(0, 3).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-[var(--radius-md)] border border-white/10 px-[var(--space-sm)] py-[var(--space-xs)] text-center text-xs">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
