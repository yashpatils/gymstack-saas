"use client";

import type { ReactNode } from "react";
import { PlatformAppShell } from "../../../src/components/platform/layout/PlatformAppShell";
import { adminNavConfig } from "../../../src/config/nav.config";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformAppShell
      navItems={adminNavConfig}
      header={{
        leftSlot: <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">Admin</span>,
        centerSlot: <span className="text-sm font-semibold">Platform Console</span>,
        rightSlot: <span className="text-xs text-muted-foreground">PLATFORM_ADMIN</span>,
      }}
    >
      {children}
    </PlatformAppShell>
  );
}
