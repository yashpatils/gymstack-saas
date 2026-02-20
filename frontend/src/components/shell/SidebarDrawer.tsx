"use client";

import * as React from "react";
import type { AppNavItem } from "./nav-config";
import SidebarNav from "./SidebarNav";
import { TOPBAR_H } from "./constants";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
      />

      <div
        className="absolute left-0 w-[320px] max-w-[85vw] border-r border-border bg-background/70 shadow-xl backdrop-blur-xl"
        style={{
          top: TOPBAR_H,
          height: `calc(100dvh - ${TOPBAR_H}px)`,
        }}
      >
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-y-auto">
            <SidebarNav
              items={items}
              title={title}
              subtitle={subtitle}
              mobileOpen
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
