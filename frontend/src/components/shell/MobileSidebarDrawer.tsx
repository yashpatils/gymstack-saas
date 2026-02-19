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
  const topClass = topOffset ? undefined : "top-[var(--topbar-h)] h-[calc(100dvh-var(--topbar-h))]";
  const topStyle = topOffset ? { top: `${topOffset}px`, height: `calc(100dvh - ${topOffset}px)` } : undefined;

  useOnClickOutside(refs, onClose, open);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[48] lg:hidden" aria-hidden={!open}>
      <button
        type="button"
        data-testid="mobile-drawer-backdrop"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        id="platform-sidebar-drawer"
        ref={drawerRef}
        className={`platform-sidebar-modern absolute left-0 z-[55] w-[min(320px,85vw)] border-r border-border/70 bg-background p-4 shadow-xl ${topClass ?? ""}`}
        style={topStyle}
        aria-label="Mobile navigation"
        data-testid="mobile-drawer"
      >
        <div className="h-full overflow-y-auto pr-1">{children}</div>
      </aside>
    </div>
  );
}
