"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";
import type { NotificationItem, NotificationPageResponse } from "@/src/components/notifications/notification-types";

function severityClass(severity: NotificationItem["severity"]): string {
  if (severity === "critical") return "border-rose-500/60 bg-rose-500/10";
  if (severity === "warning") return "border-amber-400/60 bg-amber-400/10";
  return "border-sky-400/40 bg-sky-400/10";
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationPageResponse | null>(null);

  const load = async () => {
    const next = await apiFetch<NotificationPageResponse>("/api/notifications?page=1&pageSize=50", { method: "GET", cache: "no-store" });
    setData(next);
  };

  const markAsRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="page space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="text-sm text-slate-300">Unread: {data?.unreadCount ?? 0}</p>
      <div className="space-y-3">
        {data?.items.map((item) => (
          <article key={item.id} className={`rounded-xl border p-4 ${severityClass(item.severity)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-slate-200">{item.body}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <button className="button secondary" type="button" disabled={Boolean(item.readAt)} onClick={() => markAsRead(item.id)}>
                {item.readAt ? "Read" : "Mark as read"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
