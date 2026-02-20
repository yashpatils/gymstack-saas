"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppNavItem } from "./nav-config";

function normalizePath(path: string) {
  if (!path) return "/";
  const url = path.split("?")[0].split("#")[0];
  if (url.length > 1 && url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function isActivePath(currentPath: string, itemHref: string, exact?: boolean) {
  const current = normalizePath(currentPath);
  const href = normalizePath(itemHref);

  if (exact) return current === href;
  if (href === "/") return current === "/";

  // Prevent "/platform" from matching everything under it; otherwise Overview stays active.
  if (href === "/platform" || href === "/admin") return current === href;

  return current === href || current.startsWith(`${href}/`);
}

export type SidebarNavProps = {
  items: AppNavItem[];
  title?: string;
  subtitle?: string;

  // needed for shell-preview and drawer usage
  mobileOpen?: boolean;
  onClose?: () => void;

  collapsed?: boolean;
};

export function SidebarContent({
  items,
  title,
  subtitle,
  collapsed,
  onClose,
}: Pick<SidebarNavProps, "items" | "title" | "subtitle" | "collapsed" | "onClose">) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col px-3 pb-4 pt-4">
      <div className="mb-3 rounded-xl border border-border bg-card/60 px-3 py-3">
        <div className="text-xs font-medium tracking-wide text-muted-foreground">GYM STACK</div>
        <div className="mt-1 text-base font-semibold">{title ?? "Platform"}</div>
        {subtitle ? <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>

      <nav className="flex-1 overflow-y-auto pr-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href, "exact" in item ? (item as AppNavItem & { exact?: boolean }).exact : false);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={[
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                    active
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-transparent hover:border-border hover:bg-accent/40",
                  ].join(" ")}
                >
                  {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                  {!collapsed ? <span className="truncate">{"title" in item ? (item as AppNavItem & { title?: string }).title : item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-3 text-xs text-muted-foreground">Tenant owner controls enabled</div>
    </div>
  );
}

export default function SidebarNav(props: SidebarNavProps) {
  return <SidebarContent {...props} />;
}
