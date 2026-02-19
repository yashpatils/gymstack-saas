"use client";

import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

type MobileSidebarDrawerProps = {
  open: boolean;
  topOffset?: number;
  onClose: () => void;
  children: ReactNode;
};

export function MobileSidebarDrawer({ open, topOffset, onClose, children }: MobileSidebarDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const refs = useMemo(() => [drawerRef], []);
  const topClass = topOffset ? undefined : "top-[var(--topbar-h)]";
  const topStyle = topOffset ? { top: `${topOffset}px`, height: `calc(100vh - ${topOffset}px)` } : undefined;

  useOnClickOutside(refs, onClose, open);

  return (
    <>
      {open ? (
        <button
          type="button"
          data-testid="mobile-drawer-backdrop"
          aria-label="Close menu"
          className={`fixed inset-x-0 bottom-0 z-[48] bg-black/60 lg:hidden ${topClass ?? ""}`}
          style={topOffset ? { top: `${topOffset}px` } : undefined}
          onClick={onClose}
        />
      ) : null}
      <aside
        id="platform-sidebar-drawer"
        ref={drawerRef}
        className={`platform-sidebar-modern fixed left-0 z-[55] w-[min(320px,85vw)] border-r border-border/70 p-4 shadow-xl transition-transform duration-200 ease-out lg:hidden ${topClass ?? ""} ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={topStyle}
        aria-label="Mobile navigation"
        data-testid="mobile-drawer"
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1">{children}</div>
        </div>
      </aside>
    </>
  );
}
