import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationSeverity, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationItem = {
  id: string;
  tenantId: string;
  locationId: string | null;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, tenantId: string, page = 1, pageSize = 20): Promise<{ items: NotificationItem[]; page: number; pageSize: number; total: number; unreadCount: number }> {
    const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));
    const where = { userId, tenantId };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);

    return {
      items: items.map((item) => ({ ...item, metadata: (item.metadata as Record<string, unknown> | null) ?? null })),
      page: Math.max(1, page),
      pageSize: take,
      total,
      unreadCount,
    };
  }

  async markAsRead(userId: string, tenantId: string, notificationId: string): Promise<NotificationItem> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: existing.readAt ?? new Date(),
      },
    });

    return { ...updated, metadata: (updated.metadata as Record<string, unknown> | null) ?? null };
  }

  async createForUser(input: {
    tenantId: string;
    locationId?: string | null;
    userId: string;
    type: NotificationType;
    severity?: NotificationSeverity;
    title: string;
    body: string;
    metadata?: Prisma.InputJsonObject;
  }): Promise<NotificationItem> {
    const created = await this.prisma.notification.create({
      data: {
        ...input,
        locationId: input.locationId ?? null,
        severity: input.severity ?? 'info',
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return { ...created, metadata: (created.metadata as Record<string, unknown> | null) ?? null };
  }
}

export { NotificationService as NotificationsService };
