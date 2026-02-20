"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { AppNavItem } from "./nav-config";
import { SidebarNav } from "./Sidebar";

type MobileSidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: AppNavItem[];
  title: string;
  subtitle?: string;
};

export function MobileSidebarDrawer({
  open,
  onClose,
  items,
  title,
  subtitle,
}: MobileSidebarDrawerProps): ReactNode {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) onClose();
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 lg:hidden">
        <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      </div>

      <div
        className="fixed left-0 z-40 h-[calc(100vh-var(--topbar-h))] w-[min(360px,100%)] overflow-y-auto border-r border-border bg-card/80 shadow-xl backdrop-blur-xl lg:hidden"
        style={{ top: "var(--topbar-h)" }}
        ref={panelRef}
      >
        <SidebarNav
          items={items}
          collapsed={false}
          onNavigate={onClose}
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          mobileOpen
        />
      </div>
    </>
  );
}
