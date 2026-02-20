import type { ReactNode } from "react";

export function PlatformHeader({ leftSlot, centerSlot, rightSlot }: { leftSlot?: ReactNode; centerSlot?: ReactNode; rightSlot?: ReactNode }) {
  return (
    <header className="sticky top-0 z-[var(--z-header)] h-[var(--layout-header-platform)] border-b border-border bg-background/70 px-[var(--layout-content-padding)] backdrop-blur">
      <div className="mx-auto grid h-full w-full max-w-[var(--layout-content-max-width)] grid-cols-[1fr_auto_1fr] items-center gap-[var(--space-md)]">
        <div className="flex items-center gap-[var(--space-sm)]">{leftSlot}</div>
        <div className="flex justify-center">{centerSlot}</div>
        <div className="flex justify-end gap-[var(--space-sm)]">{rightSlot}</div>
      </div>
    </header>
  );
}
