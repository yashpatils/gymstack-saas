"use client";

import * as React from "react";
import { ShellIcon } from "./ShellIcon";
import { ShellClient } from "./ShellClient";
import type { AppNavItem } from "./nav-config";

type AppShellProps = {
  items: AppNavItem[];
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function AppShell({ items, title, subtitle, rightSlot, leftSlot, children }: AppShellProps) {
  return (
    <ShellClient
      items={items}
      topTitle={title}
      sidebarTitle="GYM STACK"
      sidebarSubtitle={subtitle}
      topRight={rightSlot}
      renderTopLeft={({ openMenu }) => (
        <>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur hover:bg-muted lg:hidden"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <ShellIcon name="menu" width={16} height={16} />
          </button>
          {leftSlot}
        </>
      )}
    >
      {children}
    </ShellClient>
  );
}
