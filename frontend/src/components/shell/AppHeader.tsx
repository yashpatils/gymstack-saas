"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

type AppHeaderProps = {
  onToggleMenu: () => void;
  showMenuToggle?: boolean;
  leftExtra?: ReactNode;
  centerContent?: ReactNode;
  accountName: string;
  accountInitials: string;
  accountLinks?: Array<{ href: string; label: string }>;
  onLogout?: () => void;
};

export function AppHeader({
  onToggleMenu,
  showMenuToggle = true,
  leftExtra,
  centerContent,
  accountName,
  accountInitials,
  accountLinks = [{ href: "/platform/account", label: "Account info" }],
  onLogout,
}: AppHeaderProps) {
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
    <header className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl">
      <div className="px-4 py-3 md:px-6">
        <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2">
            {showMenuToggle ? (
              <button type="button" className="button secondary platform-menu-toggle topbar-icon-button lg:hidden" onClick={onToggleMenu} aria-label="Open menu">☰</button>
            ) : null}
            {leftExtra}
          </div>
          <div className="flex justify-center">{centerContent}</div>
          <div className="flex justify-end">
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="button secondary flex h-10 items-center gap-2 rounded-xl px-2"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <span className="user-chip-avatar h-8 w-8 rounded-full">{accountInitials}</span>
                <span className="hidden max-w-[120px] truncate sm:block">{accountName}</span>
                <span className="text-xs">▾</span>
              </button>
              {isAccountMenuOpen ? (
                <div ref={accountMenuRef} className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl" role="menu">
                  {accountLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10" onClick={() => setIsAccountMenuOpen(false)}>{link.label}</Link>
                  ))}
                  {onLogout ? (
                    <button type="button" className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20" onClick={() => {
                      setIsAccountMenuOpen(false);
                      onLogout();
                    }}>Logout</button>
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
