"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Membership } from "../../types/auth";

export function Topbar({
  initials,
  memberships,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
}: {
  initials: string;
  memberships: Membership[];
  onLogout: () => void;
  canSwitchMode: boolean;
  activeMode?: "OWNER" | "MANAGER";
  onSwitchMode: (mode: "OWNER" | "MANAGER") => void;
}) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="platform-topbar-modern">
      <div />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {memberships.length > 1 ? <Link href="/select-workspace" className="button secondary">Workspace</Link> : null}
        {canSwitchMode ? (
          <div className="flex items-center gap-2 rounded-full border border-border/70 px-2 py-1 text-xs">
            <button type="button" className={`button ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner Console</button>
            <button type="button" className={`button ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager Console</button>
          </div>
        ) : null}
        <button type="button" className="button ghost" aria-label="Notifications">🔔</button>
        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            className="button secondary inline-flex items-center gap-2"
            onClick={() => setIsAccountMenuOpen((current) => !current)}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <span className="user-chip-avatar">{initials}</span>
            Account
          </button>
          {isAccountMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl" role="menu">
              <Link href="/platform/settings" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10" onClick={() => setIsAccountMenuOpen(false)}>
                Account Settings
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
