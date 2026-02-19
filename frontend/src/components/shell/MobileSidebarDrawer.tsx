"use client";

import type { ReactNode } from "react";

type MobileSidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MobileSidebarDrawer({ open, onClose, children }: MobileSidebarDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
        type="button"
      />
      <div className="absolute left-0 top-0 h-full w-[320px] max-w-[85vw] border-r border-border bg-background shadow-xl">
        <div className="h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
