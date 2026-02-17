"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiFetch";
import type { NotificationPageResponse } from "./notification-types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationPageResponse | null>(null);

  const load = async () => {
    const next = await apiFetch<NotificationPageResponse>("/api/notifications?page=1&pageSize=8", { method: "GET", cache: "no-store" });
    setData(next);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="relative">
      <button type="button" className="button ghost" aria-label="notifications" onClick={() => setOpen((value) => !value)}>
        🔔 {data?.unreadCount ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs">{data.unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Link href="/platform/notifications" className="text-xs text-indigo-300" onClick={() => setOpen(false)}>View all</Link>
          </div>
          <ul className="space-y-2">
            {data?.items.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-2 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-300">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
