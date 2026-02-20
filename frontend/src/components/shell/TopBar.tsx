"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title?: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function TopBar({ title, leftSlot, rightSlot }: TopBarProps) {
  return (
    <header
      data-testid="topbar"
      className="sticky top-0 z-[60] w-full border-b border-border/70 bg-[var(--surface-overlay)] backdrop-blur-xl"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-3">
        <div className="flex items-center justify-center">
          <div className="max-w-[70ch] truncate text-sm font-medium">{title}</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">{leftSlot}</div>
          <div className="flex items-center justify-end gap-2">{rightSlot}</div>
        </div>
      </div>
    </header>
  );
}
