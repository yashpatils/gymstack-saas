"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AppNavItem } from "./nav-config";

type SidebarNavProps = {
  items: AppNavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  title: string;
  subtitle?: string;
  className?: string;
};

export function SidebarContent({
  items,
  collapsed = false,
  onNavigate,
  title,
  subtitle,
  className = "",
}: SidebarNavProps): ReactNode {
  const pathname = usePathname();

  return (
    <div className={`h-full w-full ${className}`}>
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 backdrop-blur-md">
          <div className="text-[11px] tracking-[0.22em] text-muted-foreground">GYM STACK</div>
          <div className="mt-1 text-lg font-semibold leading-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>

      <div className="mt-4 h-[calc(100%-120px)] overflow-y-auto px-2 pb-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => onNavigate?.()}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  "hover:bg-accent/40",
                  isActive ? "bg-accent/60 ring-1 ring-accent/40" : "",
                ].join(" ")}
              >
                <span className="shrink-0 opacity-90">{item.icon}</span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function SidebarNav(props: SidebarNavProps): ReactNode {
  return <SidebarContent {...props} />;
}
