"use client";

import * as React from "react";
import type { AppNavItem } from "./nav-config";
import { SidebarNav } from "./SidebarNav";

type SidebarDrawerProps = {
  items: AppNavItem[];
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export default function SidebarDrawer({
  items,
  open,
  onClose,
  title,
  subtitle,
}: SidebarDrawerProps) {
  React.useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed left-0 top-0 z-50 h-dvh w-[min(90vw,360px)] max-w-full border-r border-border bg-card/90 shadow-xl backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Menu</div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        <div className="h-[calc(100dvh-49px)] overflow-y-auto p-3">
          <SidebarNav
            items={items}
            onNavigate={onClose}
            title={title}
            subtitle={subtitle}
            className="h-full border-r-0"
          />
        </div>
      </aside>
    </div>
  );
}
