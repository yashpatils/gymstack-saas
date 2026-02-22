"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import type { AppNavItem } from "./nav-config";
import { cn } from "../ui/utils";

export type SidebarNavProps = {
  items: AppNavItem[];
  title?: string;
  subtitle?: string;
  onNavigate?: () => void;
  className?: string;
};

function normalizePath(path: string) {
  if (!path) return "/";
  const url = path.split("?")[0].split("#")[0];
  if (url.length > 1 && url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/platform" || target === "/platform/overview" || target === "/admin") {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
}

export function SidebarNav({ items, title, subtitle, onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "h-full border-r border-border bg-card/70 backdrop-blur-xl shadow-lg flex flex-col",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="px-4 pt-4">
          {title ? <div className="text-sm font-semibold">{title}</div> : null}
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const content = (
              <>
                {item.icon ? <span className="h-4 w-4 shrink-0 text-current opacity-90 [&_svg]:text-current">{item.icon}</span> : null}
                <span className="min-w-0 flex-1 truncate text-current">{item.label}</span>
              </>
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => onNavigate?.()}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-900 transition-colors dark:text-slate-100",
                  "hover:bg-indigo-600 hover:text-white focus-visible:bg-indigo-600 focus-visible:text-white focus-visible:outline-none",
                  "[&_svg]:text-current [&_span]:text-current",
                  "hover:[&_svg]:!text-white hover:[&_span]:!text-white",
                  "focus-visible:[&_svg]:!text-white focus-visible:[&_span]:!text-white",
                  active && "bg-indigo-600 text-white font-medium [&_svg]:!text-white [&_span]:!text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default SidebarNav;
