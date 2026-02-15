"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Membership } from "../../types/auth";

export function Topbar({
  initials,
  displayName,
  tenantName,
  isTenantOwner,
  memberships,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
  onToggleMenu,
}: {
  initials: string;
  displayName: string;
  tenantName?: string;
  isTenantOwner: boolean;
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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="platform-topbar-modern">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" className="button secondary topbar-icon-button" onClick={onToggleMenu} aria-label="Toggle menu">
          ☰
        </button>
        <Link href="/platform" className="text-sm font-semibold text-slate-200 hover:text-white">Platform</Link>
      </div>

      <div className="min-w-0 text-center">
        {isTenantOwner && tenantName ? (
          <p className="truncate text-sm font-semibold text-slate-100 md:text-base">{tenantName}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        {memberships.length > 1 ? <Link href="/select-workspace" className="button secondary button-sm">Workspace</Link> : null}
        {canSwitchMode ? (
          <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-slate-900/40 p-1 text-xs">
            <button type="button" className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner</button>
            <button type="button" className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager</button>
          </div>
        ) : null}
        <button type="button" className="button ghost topbar-icon-button" aria-label="Notifications">🔔</button>
        <div ref={accountMenuRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            className="button secondary button-sm inline-flex items-center gap-2"
            onClick={() => setIsAccountMenuOpen((current) => !current)}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <span className="user-chip-avatar">{initials}</span>
            <span className="max-w-32 truncate">{displayName}</span>
          </button>
          {isAccountMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl" role="menu">
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
    </header>
  );
}
