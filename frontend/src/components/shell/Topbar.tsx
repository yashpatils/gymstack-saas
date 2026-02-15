"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

export function Topbar({
  initials,
  displayName,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
  onToggleMenu,
}: {
  initials: string;
  displayName: string;
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
    <header className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl">
      <div className="px-4 md:px-6">
        <div className="flex h-10 items-center justify-center md:h-12">
          <span className="truncate text-base font-semibold tracking-wide text-foreground/90 md:text-lg">
            Gym Stack
          </span>
        </div>

        <div className="grid h-12 grid-cols-3 items-center md:h-14">
          <div className="justify-self-start flex items-center gap-2">
            <button
              type="button"
              className="button secondary h-9 w-9 rounded-xl p-0 lg:hidden md:h-10 md:w-10"
              onClick={onToggleMenu}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <button
              type="button"
              className="button ghost h-9 w-9 rounded-xl p-0 md:h-10 md:w-10"
              aria-label="Notifications"
            >
              🔔
            </button>
          </div>

          <div className="justify-self-center flex items-center justify-center">
          {canSwitchMode ? (
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-slate-900/40 p-1 text-xs">
              <button type="button" className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner</button>
              <button type="button" className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager</button>
            </div>
          ) : null}
          </div>

          <div className="justify-self-end flex items-center gap-2">
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary inline-flex h-9 items-center gap-2 rounded-xl px-2.5 md:h-10"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <span className="user-chip-avatar">{initials}</span>
                <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
                <span className="text-xs">▾</span>
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

          <div className="flex min-w-0 items-center gap-2 justify-self-end whitespace-nowrap">
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary inline-flex h-9 items-center gap-2 rounded-xl px-2.5 md:h-10 max-w-full"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <span className="user-chip-avatar">{initials}</span>
                <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
                <span className="text-xs">▾</span>
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
      </div>
    </header>
  );
}
