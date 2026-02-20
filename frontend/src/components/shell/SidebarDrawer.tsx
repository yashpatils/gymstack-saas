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
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close menu backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="absolute left-0 top-0 h-full w-[320px] border-r border-border bg-background/80 backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full overflow-y-auto p-3">
          <SidebarNav items={items} onNavigate={onClose} title={title} subtitle={subtitle} className="h-full border-r-0" />
        </div>
      </aside>
    </div>
  );
}
