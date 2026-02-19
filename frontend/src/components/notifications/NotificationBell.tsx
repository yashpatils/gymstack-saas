"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../lib/apiFetch";
import type { NotificationPageResponse } from "./notification-types";
import { ShellIcon } from "../shell/ShellIcon";

function getPopoverPosition(trigger: DOMRect, popoverHeight: number): CSSProperties {
  const viewportPadding = 12;
  const width = Math.min(384, window.innerWidth - viewportPadding * 2);
  const left = Math.min(Math.max(trigger.right - width, viewportPadding), window.innerWidth - width - viewportPadding);
  const roomBelow = window.innerHeight - trigger.bottom - viewportPadding;
  const openAbove = roomBelow < popoverHeight + 8 && trigger.top > popoverHeight;
  const maxTop = Math.max(viewportPadding, window.innerHeight - popoverHeight - viewportPadding);
  const top = openAbove
    ? Math.max(viewportPadding, trigger.top - popoverHeight - 8)
    : Math.min(maxTop, trigger.bottom + 8);

  return {
    position: "fixed",
    top,
    left,
    width,
    maxHeight: `calc(100dvh - ${viewportPadding * 2}px)`,
  };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationPageResponse | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const next = await apiFetch<NotificationPageResponse>("/api/notifications?page=1&pageSize=8", { method: "GET", cache: "no-store" });
      setData(next);
    };

    void load();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }
      const popoverHeight = popoverRef.current?.offsetHeight ?? 320;
      setPopoverStyle(getPopoverPosition(triggerRef.current.getBoundingClientRect(), popoverHeight));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="button secondary topbar-icon-button" aria-label="Notifications" onClick={() => setOpen((value) => !value)}>
        <ShellIcon name="bell" width={16} height={16} />
        {data?.unreadCount ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{data.unreadCount}</span> : null}
      </button>
      {open
        ? createPortal(
            <div ref={popoverRef} className="z-[110] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-xl" style={popoverStyle} role="dialog" aria-label="Notifications panel">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <Link href="/platform/notifications" className="text-xs text-primary" onClick={() => setOpen(false)}>View all</Link>
              </div>
              <ul className="space-y-2">
                {data?.items.slice(0, 5).map((item) => (
                  <li key={item.id} className="rounded-lg border border-border p-2 text-sm">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
