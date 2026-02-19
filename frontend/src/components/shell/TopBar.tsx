"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title?: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function TopBar({ title, leftSlot, rightSlot }: TopBarProps) {
  return (
    <header data-testid="topbar" className="z-[60] h-[var(--topbar-h)] w-full border-border/70 bg-[var(--surface-overlay)] backdrop-blur-xl">
      <div className="h-full px-4">
        <div className="flex h-full items-center gap-2">
          <div className="flex items-center gap-2">{leftSlot}</div>
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="max-w-[70ch] truncate text-sm font-medium">{title}</div>
          </div>
          <div className="flex items-center justify-end gap-2">{rightSlot}</div>
        </div>
      </div>
    </header>
  );
}
