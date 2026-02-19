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
      <div className="relative mx-auto flex h-full w-full items-center gap-2 px-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">{leftSlot}</div>
        <div className="pointer-events-none absolute left-1/2 max-w-[60vw] -translate-x-1/2 truncate whitespace-nowrap text-center text-sm font-semibold text-foreground">
          {title}
        </div>
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
