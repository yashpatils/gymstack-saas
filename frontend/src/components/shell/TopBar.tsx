"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title?: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function TopBar({ title, leftSlot, rightSlot }: TopBarProps) {
  return (
    <header data-testid="topbar" className="z-[60] h-[var(--topbar-h)] w-full border-b border-border/70 bg-[var(--surface-overlay)] backdrop-blur-xl">
      <div className="mx-auto grid h-full w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 lg:px-6">
        <div className="flex items-center gap-2">{leftSlot}</div>
        <div className="truncate text-center text-sm font-semibold text-foreground">{title}</div>
        <div className="flex items-center justify-end gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
