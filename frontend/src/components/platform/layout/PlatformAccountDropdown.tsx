"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useOnClickOutside } from "../../../hooks/useOnClickOutside";

type PlatformAccountDropdownProps = {
  label: string;
  initials: string;
  onLogout: () => void;
};

export function PlatformAccountDropdown({ label, initials, onLogout }: PlatformAccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
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

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const trigger = triggerRef.current.getBoundingClientRect();
      const width = 256;
      const viewportPadding = 12;
      const left = Math.min(
        Math.max(trigger.right - width, viewportPadding),
        window.innerWidth - width - viewportPadding,
      );
      const top = Math.min(window.innerHeight - viewportPadding, trigger.bottom + 8);

      setMenuStyle({
        position: "fixed",
        top,
        left,
        width,
        maxHeight: `calc(100vh - ${viewportPadding * 2}px)`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        className="button secondary relative z-10 flex h-10 items-center gap-2 rounded-xl px-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open account menu"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <span className="user-chip-avatar h-8 w-8 rounded-full">{initials}</span>
        <span className="hidden max-w-[120px] truncate sm:block">{label}</span>
        <span className="text-xs">▾</span>
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={menuStyle}
              className="z-[120] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/80 p-2 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-neutral-950/70"
              onClick={(event) => event.stopPropagation()}
            >
              <Link href="/platform/account" className="block rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/5 focus:bg-white/10 focus:text-white" onClick={(event) => { event.stopPropagation(); setIsOpen(false); }}>
                Account info
              </Link>
              <Link href="/platform/settings" className="mt-1 block rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/5 focus:bg-white/10 focus:text-white" onClick={(event) => { event.stopPropagation(); setIsOpen(false); }}>
                Settings
              </Link>
              <button
                type="button"
                className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 focus:bg-red-500/15 focus:text-red-300"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen(false);
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
