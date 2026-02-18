"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";
import type { NotificationItem, NotificationPageResponse } from "@/src/components/notifications/notification-types";
import { PageCard, PageContainer, PageHeader, PageSection } from "@/src/components/platform/page/primitives";

function severityClass(severity: NotificationItem["severity"]): string {
  if (severity === "critical") return "border-rose-500/60 bg-rose-500/10";
  if (severity === "warning") return "border-amber-400/60 bg-amber-400/10";
  return "border-sky-400/40 bg-sky-400/10";
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationPageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const next = await apiFetch<NotificationPageResponse>("/api/notifications?page=1&pageSize=50", { method: "GET", cache: "no-store" });
      setData(next);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description="Track alerts, reminders, and updates from your workspace in one list."
        actions={<span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">Unread: {data?.unreadCount ?? 0}</span>}
      />

      <PageSection>
        <PageCard title="Recent activity">
          {loading ? <p className="text-sm text-slate-300">Loading notifications…</p> : null}
          {!loading && !data?.items.length ? (
            <p className="text-sm text-slate-300">You are all caught up. New notifications will appear here.</p>
          ) : null}
          <div className="space-y-3">
            {data?.items.map((item) => (
              <article key={item.id} className={`rounded-xl border p-4 ${severityClass(item.severity)}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
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
        </PageCard>
      </PageSection>
    </PageContainer>
  );
}
