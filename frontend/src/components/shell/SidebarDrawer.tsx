"use client";

import { useMemo, useRef } from "react";
import type { AppNavItem } from "./nav-config";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { SidebarContent } from "./SidebarNav";

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
        <button
          type="button"
          data-testid="mobile-drawer-backdrop"
          aria-label="Close menu"
          className="gs-sidebar-drawer__backdrop fixed inset-x-0 bottom-0 top-[var(--header-h)] z-[48] bg-black/35 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        id="platform-sidebar-drawer"
        ref={drawerRef}
        className={`gs-sidebar-drawer platform-sidebar-modern fixed left-0 top-[var(--header-h)] z-[55] w-[min(320px,86vw)] border-r border-border/60 bg-background/75 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label={`${title} mobile navigation`}
        data-testid="mobile-drawer"
        aria-hidden={!open}
      >
        <div className="h-full overflow-y-auto">
          <SidebarContent
            items={items}
            title={title}
            subtitle={subtitle}
            collapsed={false}
            onNavigate={onClose}
            className="h-full"
          />
        </div>
      </aside>
    </>
  );
}
