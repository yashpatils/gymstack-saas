"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Membership } from "../../types/auth";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { AppContextTitle } from "./AppContextTitle";

export function Topbar({
  initials,
  displayName,
  memberships,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
  onToggleMenu,
}: {
  initials: string;
  displayName: string;
  memberships: Membership[];
  onLogout: () => void;
  canSwitchMode: boolean;
  activeMode?: "OWNER" | "MANAGER";
  onSwitchMode: (mode: "OWNER" | "MANAGER") => void;
  onToggleMenu: () => void;
}) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const outsideClickRefs = useMemo(() => [accountMenuRef, triggerRef], []);

  useOnClickOutside(outsideClickRefs, () => setIsAccountMenuOpen(false), isAccountMenuOpen);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  return (
    <header className="sticky top-0 z-20 min-h-[64px] border-b border-white/5 bg-[rgba(7,10,20,0.76)] px-3 backdrop-blur-xl sm:px-4 md:min-h-[72px] md:px-6">
      <div className="pt-2 md:hidden">
        <AppContextTitle />
      </div>

      <div className="grid min-h-[64px] grid-cols-[auto,1fr] items-center gap-2 md:min-h-[72px] md:grid-cols-[minmax(0,1fr),auto,minmax(0,1fr)] md:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="button secondary topbar-icon-button lg:hidden"
            onClick={onToggleMenu}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <Link href="/platform" className="text-sm font-semibold text-slate-200 hover:text-white">Platform</Link>
        </div>

        <div className="pointer-events-none hidden min-w-0 items-center justify-center px-2 md:flex">
          <AppContextTitle />
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          {memberships.length > 1 ? <Link href="/select-workspace" className="button secondary button-sm hidden sm:inline-flex">Workspace</Link> : null}
          {canSwitchMode ? (
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-slate-900/40 p-1 text-xs">
              <button type="button" className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner</button>
              <button type="button" className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager</button>
            </div>
          ) : null}
          <button type="button" className="button ghost topbar-icon-button hidden sm:inline-flex" aria-label="Notifications">🔔</button>
          <Link href="/platform/account" className="button secondary button-sm inline-flex items-center gap-2" aria-label="Open account page">
            <span className="user-chip-avatar">{initials}</span>
            <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
          </Link>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              className="button ghost topbar-icon-button"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
            >
              ⋯
            </button>
            {isAccountMenuOpen ? (
              <div ref={accountMenuRef} className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl" role="menu">
                <Link href="/platform/account" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10" onClick={() => setIsAccountMenuOpen(false)}>
                  Account info
                </Link>
                <Link href="/platform/settings" className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10" onClick={() => setIsAccountMenuOpen(false)}>
                  Settings
                </Link>
                <button
                  type="button"
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </header>
  );
}
