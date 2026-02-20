"use client";

import * as React from "react";
import { TOPBAR_H } from "./constants";

type TopBarProps = {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
  onOpenMobileMenu?: () => void;
  leftSlot?: React.ReactNode;
};

export default function TopBar({
  title,
  rightSlot,
  onOpenMobileMenu,
  leftSlot,
}: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-[70] w-full border-b border-border bg-background/70 backdrop-blur-xl"
      style={{ height: TOPBAR_H }}
    >
      <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-4">
        <div className="flex items-center justify-center py-2">
          <div className="max-w-[75vw] break-words text-center text-sm font-semibold leading-tight text-foreground line-clamp-2">
            {title}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/50 lg:hidden"
              aria-label="Open menu"
            >
              <span className="text-lg">≡</span>
            </button>

            {leftSlot}
          </div>

          <div className="ml-auto">{rightSlot}</div>
        </div>
      </div>
    </header>
  );
}
