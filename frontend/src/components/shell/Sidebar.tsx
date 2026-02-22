"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AppNavItem } from "./nav-config";

export type SidebarProps = {
  items: AppNavItem[];
  title: string;
  subtitle?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
};

const sectionLabels: Record<AppNavItem["section"], string> = {
  core: "Core",
  operations: "Operations",
  settings: "Settings",
};

function normalizePath(path: string): string {
  if (path.length <= 1) return path;
  return path.replace(/\/+$/, "");
}

function isActivePath(pathname: string, href: string): boolean {
  const currentPath = normalizePath(pathname);
  const itemPath = normalizePath(href);

  if (itemPath === "/platform" || itemPath === "/admin" || itemPath === "/app") {
    return currentPath === itemPath;
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function SidebarContent({ items, pathname, title, subtitle, collapsed, onNavigate }: {
  items: AppNavItem[];
  pathname: string;
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Gym Stack</p>
        <p className="mt-2 text-lg font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Navigation</p>
      <nav className="mt-3 space-y-4" aria-label={`${title} navigation links`}>
        {Object.entries(sectionLabels).map(([section, label]) => {
          const scopedItems = items.filter((item) => item.section === section);
          if (!scopedItems.length) {
            return null;
          }

          return (
            <div key={section} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
              <ul className="space-y-1">
                {scopedItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`platform-nav-item ${active ? "platform-nav-item-active" : ""}`}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        <span aria-hidden="true" className="mr-2 inline-flex w-4 items-center justify-center text-current [&_svg]:text-current">{item.icon}</span>
                        <span className={`${collapsed ? "sr-only" : ""} text-current`}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar({
  items,
  title,
  subtitle,
  mobileOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const handleNavigate = onNavigate ?? onClose;

  return (
    <aside
      id="platform-sidebar"
      className={`gs-sidebar platform-sidebar-modern border-r border-border/70 p-4 ${mobileOpen ? "block h-full" : "hidden h-full lg:block"} ${collapsed ? "gs-sidebar--collapsed" : ""}`}
      aria-label={`${title} navigation`}
      data-testid="desktop-sidebar"
      data-collapsed={collapsed}
      data-mobile-open={mobileOpen}
      data-has-on-close={Boolean(onClose)}
    >
      {onToggleCollapsed ? (
        <button
          type="button"
          className="button ghost mb-2 hidden h-8 px-2 text-xs lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      ) : null}
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-full flex-1 overflow-y-auto pr-1" data-testid="sidebar-scroll-region">
          <SidebarContent items={items} pathname={pathname} title={title} subtitle={subtitle} collapsed={collapsed} onNavigate={handleNavigate} />
        </div>
      </div>
    </aside>
  );
}

export function SidebarNav(props: SidebarProps): ReactNode {
  return <Sidebar {...props} />;
}
