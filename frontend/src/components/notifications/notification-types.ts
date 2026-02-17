export type NotificationItem = {
  id: string;
  tenantId: string;
  locationId: string | null;
  userId: string;
  type: "ATTENDANCE_DROP" | "BOOKING_DROP" | "CANCELLATION_SPIKE" | "WEEKLY_DIGEST" | "SYSTEM";
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPageResponse = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
};
