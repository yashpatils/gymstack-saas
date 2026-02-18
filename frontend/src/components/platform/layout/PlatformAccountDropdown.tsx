"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnClickOutside } from "@/src/hooks/useOnClickOutside";

type PlatformAccountDropdownProps = {
  label: string;
  initials: string;
  onLogout: () => void;
};

export function PlatformAccountDropdown({ label, initials, onLogout }: PlatformAccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const outsideRefs = useMemo(() => [menuRef, triggerRef], []);
  useOnClickOutside(outsideRefs, () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="button secondary flex h-10 items-center gap-2 rounded-xl px-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open account menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="user-chip-avatar h-8 w-8 rounded-full">{initials}</span>
        <span className="hidden max-w-[120px] truncate sm:block">{label}</span>
        <span className="text-xs">▾</span>
      </button>

      {isOpen ? (
        <div ref={menuRef} role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-64 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl">
          <Link href="/platform/account" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10" onClick={() => setIsOpen(false)}>
            Account info
          </Link>
          <Link href="/platform/settings" className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10" onClick={() => setIsOpen(false)}>
            Settings
          </Link>
          <button
            type="button"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
