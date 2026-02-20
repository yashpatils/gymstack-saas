"use client";

import { useMemo, useRef } from "react";
import type { AppNavItem } from "./nav-config";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { SidebarNav } from "./Sidebar";

type SidebarDrawerProps = {
  items: AppNavItem[];
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
};

export function SidebarDrawer({ items, open, onClose, title, subtitle }: SidebarDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const refs = useMemo(() => [drawerRef], []);

  useOnClickOutside(refs, onClose, open);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" data-testid="mobile-drawer-backdrop">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={onClose}
          />
        </div>
      ) : null}
      <aside
        id="platform-sidebar-drawer"
        ref={drawerRef}
        className={`gs-sidebar-drawer platform-sidebar-modern fixed left-0 top-[var(--topbar-h)] z-40 h-[calc(100vh-var(--topbar-h))] w-[min(320px,85vw)] overflow-y-auto border-r border-border/60 bg-background/70 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label={`${title} mobile navigation`}
        data-testid="mobile-drawer"
        aria-hidden={!open}
      >
        <SidebarNav
          items={items}
          title={title}
          subtitle={subtitle}
          collapsed={false}
          mobileOpen
          onClose={onClose}
          onNavigate={onClose}
        />
      </aside>
    </>
  );
}
