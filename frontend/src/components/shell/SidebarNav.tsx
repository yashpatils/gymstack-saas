"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppNavItem } from "./nav-config";

type SidebarNavProps = {
  items: AppNavItem[];
  title: string;
  subtitle?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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

  if (currentPath === itemPath) {
    return true;
  }

  if (itemPath === "/platform") {
    return false;
  }

  return currentPath.startsWith(`${itemPath}/`);
}

export function SidebarContent({ items, pathname, title, subtitle, collapsed, onNavigate }: {
  items: AppNavItem[];
  pathname: string;
  title: string;
  subtitle: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="gs-sidebar__brand rounded-2xl border border-border/80 bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Gym Stack</p>
        <p className="platform-sidebar-title mt-2 text-lg font-semibold text-foreground">{title}</p>
        <p className="platform-sidebar-subtitle mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Navigation</p>
      <nav className="mt-3 space-y-4" aria-label={`${title} navigation links`}>
        {Object.entries(sectionLabels).map(([section, label]) => {
          const scopedItems = items.filter((item) => item.section === section);
          if (!scopedItems.length) return null;

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
                        <span aria-hidden="true" className="mr-2 inline-flex w-4 items-center justify-center">{item.icon}</span>
                        <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
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

export function SidebarNav({
  items,
  title,
  subtitle = "",
  mobileOpen = false,
  onClose,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: SidebarNavProps) {
  const pathname = usePathname();

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
      <div className="h-full overflow-y-auto">
        <SidebarContent items={items} pathname={pathname} title={title} subtitle={subtitle} collapsed={collapsed} onNavigate={onNavigate ?? onClose} />
      </div>
    </aside>
  );
}
