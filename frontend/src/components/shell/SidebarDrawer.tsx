"use client";

import * as React from "react";
import type { AppNavItem } from "./nav-config";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { SidebarNav } from "./SidebarNav";
import { cn } from "../ui/utils";
import { MOBILE_DRAWER_WIDTH, TOPBAR_HEIGHT } from "./shell-constants";

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
  const ref = React.useRef<HTMLDivElement | null>(null);

  useOnClickOutside([ref], () => {
    if (open) onClose();
  }, open);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed left-0 z-50 lg:hidden",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          top: TOPBAR_HEIGHT,
          height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
          width: MOBILE_DRAWER_WIDTH,
        }}
        aria-hidden={!open}
      >
        <div
          ref={ref}
          className="h-full w-full border-r border-border bg-background/75 shadow-xl backdrop-blur-xl"
        >
          <SidebarNav
            items={items}
            title={title}
            subtitle={subtitle}
            onNavigate={onClose}
            className="h-full"
          />
        </div>
      </div>
    </>
  );
}
