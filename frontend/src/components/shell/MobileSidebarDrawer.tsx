"use client";

import { useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import type { AppNavItem } from "./nav-config";
import { SidebarContent } from "./Sidebar";

type MobileSidebarDrawerProps = {
  items: AppNavItem[];
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
};

export function MobileSidebarDrawer({ items, open, onClose, title, subtitle }: MobileSidebarDrawerProps) {
  const pathname = usePathname();
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
          className="fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-[48] bg-black/60 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        id="platform-sidebar-drawer"
        ref={drawerRef}
        className={`platform-sidebar-modern fixed left-0 top-[var(--topbar-h)] z-[55] h-[calc(100vh-var(--topbar-h))] w-[min(320px,85vw)] border-r border-border/70 p-4 shadow-xl transition-transform duration-200 ease-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label={`${title} mobile navigation`}
        data-testid="mobile-drawer"
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1">
            <SidebarContent items={items} pathname={pathname} title={title} subtitle={subtitle} collapsed={false} onNavigate={onClose} />
          </div>
        </div>
      </aside>
    </>
  );
}
