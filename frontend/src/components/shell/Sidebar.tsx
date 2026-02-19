"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppNavItem } from "./nav-config";

type SidebarNavProps = {
  items: AppNavItem[];
  mobileOpen?: boolean;
  onClose?: () => void;
  title: string;
  subtitle: string;
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
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function SidebarBody({ items, pathname, title, subtitle, collapsed, onClose }: {
  items: AppNavItem[];
  pathname: string;
  title: string;
  subtitle: string;
  collapsed: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Gym Stack</p>
        <p className="platform-sidebar-title mt-2 text-lg font-semibold text-foreground">{title}</p>
        <p className="platform-sidebar-subtitle mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="platform-sidebar-section-labels">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Navigation</p>
      </div>
      <nav className="platform-sidebar-nav" aria-label={`${title} navigation links`}>
        {Object.entries(sectionLabels).map(([section, label]) => {
          const scopedItems = items.filter((item) => item.section === section);
          if (!scopedItems.length) return null;

          return (
            <div key={section} className="space-y-2">
              <p className="platform-sidebar-section-label text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
              <ul className="space-y-1">
                {scopedItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`platform-nav-item ${active ? "platform-nav-item-active" : ""}`}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        <span aria-hidden="true" className="platform-nav-item-icon mr-2 inline-flex w-4 items-center justify-center">{item.icon}</span>
                        <span className="platform-nav-item-label">{item.label}</span>
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
  mobileOpen = false,
  onClose,
  title,
  subtitle,
  collapsed = false,
  onToggleCollapsed,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <aside
        id="platform-sidebar"
        className={`platform-sidebar-modern hidden h-[calc(100vh-var(--topbar-h))] overflow-y-auto border-r border-border/70 p-4 lg:sticky lg:top-[var(--topbar-h)] lg:block ${collapsed ? "platform-sidebar-collapsed" : ""}`}
        aria-label={`${title} navigation`}
        data-testid="desktop-sidebar"
        data-collapsed={collapsed}
      >
        {onToggleCollapsed ? (
          <button
            type="button"
            className="platform-sidebar-collapse-toggle button ghost mb-2 hidden h-8 px-2 text-xs lg:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        ) : null}
        <SidebarBody items={items} pathname={pathname} title={title} subtitle={subtitle} collapsed={collapsed} />
      </aside>

      <aside
        className={`platform-sidebar-modern fixed left-0 top-[var(--topbar-h)] z-[55] h-[calc(100vh-var(--topbar-h))] w-[min(320px,85vw)] overflow-y-auto border-r border-border/70 p-4 shadow-xl transition-transform duration-200 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label={`${title} mobile navigation`}
        data-testid="mobile-drawer"
        aria-hidden={!mobileOpen}
      >
        <SidebarBody items={items} pathname={pathname} title={title} subtitle={subtitle} collapsed={false} onClose={onClose} />
      </aside>
    </>
  );
}
