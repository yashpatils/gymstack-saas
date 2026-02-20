"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { AppNavItem } from "./nav-config";
import { TOPBAR_H } from "./constants";
import { SidebarContent } from "./SidebarNav";

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
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ top: TOPBAR_H }}>
        <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
      </div>

      <div
        className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[86vw] lg:hidden"
        style={{ top: TOPBAR_H }}
        ref={panelRef}
      >
        <div className="h-full border-r border-border/60 bg-background/75 shadow-2xl backdrop-blur-xl">
          <SidebarContent
            items={items}
            collapsed={false}
            onNavigate={onClose}
            title={title}
            subtitle={subtitle}
            className="h-full"
          />
        </div>
      </div>
    </>
  );
}
