import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit = 20): Promise<NotificationItem[]> {
    const prisma = this.prisma as unknown as {
      notification: {
        findMany: (args: unknown) => Promise<NotificationItem[]>;
      };
    };

    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationItem> {
    const prisma = this.prisma as unknown as {
      notification: {
        findFirst: (args: unknown) => Promise<NotificationItem | null>;
        update: (args: unknown) => Promise<NotificationItem>;
      };
    };

    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: existing.readAt ?? new Date(),
      },
    });
  }

  async createForUser(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
  }): Promise<NotificationItem> {
    const prisma = this.prisma as unknown as {
      notification: {
        create: (args: unknown) => Promise<NotificationItem>;
      };
    };

    return prisma.notification.create({
      data: input,
    });
  }
}
