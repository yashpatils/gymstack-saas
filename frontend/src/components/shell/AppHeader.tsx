"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useThemeConfig, type ThemeMode } from "../../providers/ThemeProvider";
import { ShellIcon } from "./ShellIcon";
import TopBar from "./TopBar";

type AppHeaderProps = {
  onToggleMenu: () => void;
  showMenuToggle?: boolean;
  leftExtra?: ReactNode;
  centerContent?: ReactNode;
  accountName?: string;
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

function getMenuPosition(trigger: DOMRect, menuHeight: number): CSSProperties {
  const width = 272;
  const viewportPadding = 12;
  const left = Math.min(
    Math.max(trigger.right - width, viewportPadding),
    window.innerWidth - width - viewportPadding,
  );
  const roomBelow = window.innerHeight - trigger.bottom;
  const openAbove = roomBelow < menuHeight + viewportPadding && trigger.top > menuHeight;
  const top = openAbove ? Math.max(viewportPadding, trigger.top - menuHeight - 8) : Math.min(window.innerHeight - viewportPadding, trigger.bottom + 8);

  return {
    position: "fixed",
    top,
    left,
    width,
    maxHeight: `calc(100vh - ${viewportPadding * 2}px)`,
  };
}

export function AppHeader({
  onToggleMenu,
  showMenuToggle = true,
  leftExtra,
  centerContent,
  accountInitials,
  accountLinks = [{ href: "/platform/account", label: "Account info" }],
  onLogout,
  qaBypass = false,
  gatingStatusSummary,
}: AppHeaderProps) {
  const { themeMode, setThemeMode, effectiveTheme } = useThemeConfig();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const outsideRefs = useMemo(() => [accountMenuRef, triggerRef], []);

  useOnClickOutside(outsideRefs, () => setIsAccountMenuOpen(false), isAccountMenuOpen);

  useLayoutEffect(() => {
    if (!isAccountMenuOpen || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }
      const trigger = triggerRef.current.getBoundingClientRect();
      const menuHeight = accountMenuRef.current?.offsetHeight ?? 360;
      setMenuStyle(getMenuPosition(trigger, menuHeight));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isAccountMenuOpen]);

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

  const resolvedTitle = typeof centerContent === "string" ? centerContent : "GymStack";

  return (
    <TopBar
      title={resolvedTitle}
      left={(
        <>
          {showMenuToggle ? (
            <button
              type="button"
              data-testid="hamburger"
              className="button secondary topbar-icon-button lg:hidden"
              onClick={onToggleMenu}
              aria-label="Open menu"
            >
              <ShellIcon name="menu" width={16} height={16} />
            </button>
          ) : null}
          {leftExtra ?? (
            <button type="button" className="button secondary topbar-icon-button" aria-label="Notifications">
              <ShellIcon name="bell" width={16} height={16} />
            </button>
          )}
        </>
      )}
      right={(
        <>
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
            <ShellIcon name="chevronDown" width={14} height={14} />
          </button>
          {isAccountMenuOpen
            ? createPortal(
                <div
                  id="account-menu"
                  ref={accountMenuRef}
                  role="menu"
                  style={menuStyle}
                  className="z-[110] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
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
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {onLogout ? (
                    <button
                      type="button"
                      className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--danger-600)] hover:bg-rose-500/20"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Logout
                    </button>
                  ) : null}
                </div>,
                document.body,
              )
            : null}
        </>
      )}
    />
  );
}
