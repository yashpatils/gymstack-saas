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
        <div className="flex min-h-14 items-center gap-3 py-2">
          <div className="flex shrink-0 items-center gap-2">
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

          <div className="flex min-w-0 flex-1 items-center justify-center px-2">
            <span className="truncate text-base font-semibold tracking-wide text-foreground/90 md:text-lg">Gym Stack</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canSwitchMode ? (
              <div className="hidden items-center gap-1 rounded-xl border border-border/70 bg-slate-900/40 p-1 text-xs md:flex">
                <button type="button" className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")}>Owner</button>
                <button type="button" className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")}>Manager</button>
              </div>
            ) : null}

            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary h-10 flex items-center gap-2 rounded-xl px-2 hover:bg-white/5 transition"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <span className="h-8 w-8 rounded-full user-chip-avatar">{initials}</span>
                <span className="hidden sm:block truncate max-w-[120px]">{displayName}</span>
                <span className="text-xs">▾</span>
              </button>
              {isAccountMenuOpen ? (
                <div ref={accountMenuRef} className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-64 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl" role="menu">
                  {canSwitchMode ? (
                    <div className="mb-2 rounded-lg border border-white/10 bg-white/5 p-1 md:hidden">
                      <p className="px-2 pb-1 pt-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-400">Mode</p>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`}
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onSwitchMode("OWNER");
                          }}
                        >
                          Owner
                        </button>
                        <button
                          type="button"
                          className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`}
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onSwitchMode("MANAGER");
                          }}
                        >
                          Manager
                        </button>
                      </div>
                    </div>
                  ) : null}
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
