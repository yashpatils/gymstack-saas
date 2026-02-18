"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../lib/adminPortal";
import { ModeToggle } from "./ModeToggle";
import { LocationSwitcher } from "./LocationSwitcher";
import type { LocationOption } from "../../types/auth";

export function Topbar({
  initials,
  displayName,
  onLogout,
  canSwitchMode,
  activeMode,
  onSwitchMode,
  onToggleMenu,
  showAdminPortalLink = false,
  adminPortalUrl = ADMIN_PORTAL_FRESH_LOGIN_URL,
  showMenuToggle = true,
  canShowLocationSwitcher = false,
  locations = [],
  activeLocationId,
  onSelectLocation,
  showFeedbackLink = false,
}: {
  initials: string;
  displayName: string;
  onLogout: () => void;
  canSwitchMode: boolean;
  activeMode: "OWNER" | "MANAGER";
  onSwitchMode: (mode: "OWNER" | "MANAGER") => void;
  onToggleMenu: () => void;
  showAdminPortalLink?: boolean;
  adminPortalUrl?: string;
  showMenuToggle?: boolean;
  canShowLocationSwitcher?: boolean;
  locations?: LocationOption[];
  activeLocationId?: string | null;
  onSelectLocation: (locationId: string | null) => Promise<void>;
  showFeedbackLink?: boolean;
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
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-[var(--surface-overlay)] backdrop-blur-xl">
      <div className="px-4 py-2 md:px-6">
        <div className="flex justify-center py-1">
          <h1 className="text-base font-semibold tracking-wide text-foreground/95 md:text-lg">Gym Stack</h1>
        </div>
        <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
          <div className="flex items-center gap-2">
            {showMenuToggle ? (
              <button type="button" className="button secondary platform-menu-toggle topbar-icon-button lg:hidden" onClick={onToggleMenu} aria-label="Toggle menu">☰</button>
            ) : null}
            <button type="button" className="button ghost topbar-icon-button" aria-label="Notifications">🔔</button>
            {showFeedbackLink ? (
              <Link href="/platform/feedback" className="button secondary hidden sm:inline-flex">Send feedback</Link>
            ) : null}
            {canShowLocationSwitcher ? (
              <div className="hidden md:block">
                <LocationSwitcher locations={locations} activeLocationId={activeLocationId} activeMode={activeMode} onSelect={onSelectLocation} canCreate />
              </div>
            ) : null}
          </div>

          <div className="flex justify-center">
            {canSwitchMode ? <ModeToggle activeMode={activeMode} onSwitchMode={onSwitchMode} /> : null}
          </div>

          <div className="flex justify-end">
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary h-10 flex items-center gap-2 rounded-xl px-2"
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
                <div ref={accountMenuRef} className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-64 rounded-xl border border-border bg-card p-2 shadow-xl" role="menu">
                  {canSwitchMode ? (
                    <div className="mb-2 rounded-lg border border-border bg-background/60 p-1 md:hidden">
                      <p className="px-2 pb-1 pt-0.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mode</p>
                      <ModeToggle activeMode={activeMode} onSwitchMode={(mode) => {
                        setIsAccountMenuOpen(false);
                        onSwitchMode(mode);
                      }} />
                    </div>
                  ) : null}
                  {canShowLocationSwitcher ? (
                    <div className="mb-2 rounded-lg border border-border bg-background/60 p-2 md:hidden">
                      <LocationSwitcher locations={locations} activeLocationId={activeLocationId} activeMode={activeMode} onSelect={onSelectLocation} canCreate />
                    </div>
                  ) : null}
                  <Link href="/platform/account" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-background/60" onClick={() => setIsAccountMenuOpen(false)}>Account info</Link>
                  <Link href="/platform/settings" className="mt-1 block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-background/60" onClick={() => setIsAccountMenuOpen(false)}>Settings</Link>
                  {showAdminPortalLink ? (
                    <a href={adminPortalUrl} className="mt-1 block rounded-lg px-3 py-2 text-sm text-sky-500 hover:bg-background/60" onClick={() => setIsAccountMenuOpen(false)}>Admin portal</a>
                  ) : null}
                  <button type="button" className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20" onClick={() => {
                    setIsAccountMenuOpen(false);
                    onLogout();
                  }}>Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
