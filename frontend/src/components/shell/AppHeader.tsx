"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useThemeConfig, type ThemeMode } from "../../providers/ThemeProvider";

type AppHeaderProps = {
  onToggleMenu: () => void;
  showMenuToggle?: boolean;
  leftExtra?: ReactNode;
  centerContent?: ReactNode;
  accountName: string;
  accountInitials: string;
  accountLinks?: Array<{ href: string; label: string }>;
  onLogout?: () => void;
  qaBypass?: boolean;
  gatingStatusSummary?: string;
};

const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" },
];

export function AppHeader({
  onToggleMenu,
  showMenuToggle = true,
  leftExtra,
  centerContent,
  accountName,
  accountInitials,
  accountLinks = [{ href: "/platform/account", label: "Account info" }],
  onLogout,
  qaBypass = false,
  gatingStatusSummary,
}: AppHeaderProps) {
  const { themeMode, setThemeMode, effectiveTheme } = useThemeConfig();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const outsideRefs = useMemo(() => [accountMenuRef, triggerRef], []);

  useOnClickOutside(outsideRefs, () => setIsAccountMenuOpen(false), isAccountMenuOpen);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAccountMenuOpen]);

  return (
    <header data-testid="topbar" className="fixed inset-x-0 top-0 z-[60] h-[var(--topbar-h)] border-b border-border/70 bg-[var(--surface-overlay)] backdrop-blur-xl">
      <div className="h-full px-4 md:px-6">
        <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2">
            {showMenuToggle ? (
              <button type="button" data-testid="hamburger" className="button secondary platform-menu-toggle topbar-icon-button lg:hidden" onClick={onToggleMenu} aria-label="Open menu">☰</button>
            ) : null}
            {leftExtra}
            {qaBypass ? (
              <span className="hidden rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-amber-100 md:inline-flex">
                QA BYPASS
              </span>
            ) : null}
          </div>
          <div className="flex justify-center">{centerContent}</div>
          <div className="flex justify-end">
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary flex h-10 items-center gap-2 rounded-xl px-2"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsAccountMenuOpen((current) => !current);
                }}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-controls="account-menu"
                aria-label="Open account menu"
              >
                <span className="user-chip-avatar h-8 w-8 rounded-full">{accountInitials}</span>
                <span className="hidden max-w-[120px] truncate sm:block">{accountName}</span>
                <span className="text-xs">▾</span>
              </button>
              {isAccountMenuOpen ? (
                <div id="account-menu" ref={accountMenuRef} className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-border bg-card p-2 shadow-xl" role="menu" onClick={(event) => event.stopPropagation()}>
                  {qaBypass ? (
                    <div className="mb-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-100">
                      <p className="font-semibold tracking-wide">QA BYPASS ON</p>
                      <p className="mt-1 text-[11px] text-amber-100/90">Would be blocked: {gatingStatusSummary ?? "UNKNOWN"}</p>
                    </div>
                  ) : null}
                  <div className="mb-2 rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Theme</p>
                    <div className="mt-2 flex gap-1 rounded-lg bg-muted p-1">
                      {themeOptions.map((option) => (
                        <button
                          key={option.mode}
                          type="button"
                          className={`rounded-md px-2 py-1 text-xs ${themeMode === option.mode ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setThemeMode(option.mode);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Current: {effectiveTheme}</p>
                  </div>
                  {accountLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="mt-1 block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-background/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsAccountMenuOpen(false);
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {onLogout ? (
                    <button
                      type="button"
                      className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsAccountMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Logout
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
