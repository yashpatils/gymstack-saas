"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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

  if (itemPath === "/platform" || itemPath === "/admin" || itemPath === "/app") {
    return currentPath === itemPath;
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function SidebarContent({
  items,
  pathname,
  title,
  subtitle,
  collapsed,
  onNavigate,
}: {
  items: AppNavItem[];
  pathname: string;
  title: string;
  subtitle: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-card px-4 py-4">
        <div className="text-xs tracking-[0.3em] text-muted-foreground">GYM STACK</div>
        <div className="mt-1 text-lg font-semibold">{collapsed ? "Platform" : title}</div>
        {!collapsed ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>

      <nav className="mt-4 space-y-4" aria-label={`${title} navigation links`}>
        {Object.entries(sectionLabels).map(([section, label]) => {
          const scopedItems = items.filter((item) => item.section === section);
          if (!scopedItems.length) {
            return null;
          }

          return (
            <div key={section} className="space-y-2">
              <p className="px-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
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
                        <span aria-hidden="true" className="mr-2 inline-flex w-4 items-center justify-center">
                          {item.icon}
                        </span>
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

function Sidebar(props: SidebarNavProps): ReactNode {
  const {
    items,
    title,
    subtitle = "",
    onClose,
    onNavigate,
    collapsed = false,
    onToggleCollapsed,
  } = props;
  const pathname = usePathname();
  const handleNavigate = onNavigate ?? onClose;

  return (
    <div className="flex h-full w-full flex-col">
      {onToggleCollapsed ? (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-6">
        <SidebarContent
          items={items}
          pathname={pathname}
          title={title}
          subtitle={subtitle}
          collapsed={collapsed}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}

export function SidebarNav(props: SidebarNavProps): ReactNode {
  return <div className="h-full w-full">{Sidebar(props)}</div>;
}
