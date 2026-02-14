import type { ReactNode } from "react";
import { Sidebar, type ShellNavItem } from "./Sidebar";

export function AppShell({ pathname, items, topbar, children }: { pathname: string; items: ShellNavItem[]; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-transparent text-foreground">
      <Sidebar items={items} pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
