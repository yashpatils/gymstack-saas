import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClassBookingStatus, ClassSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type WebPushLib = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<void>;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

const REMINDER_MARKER = 'CLASS_REMINDER_2H';

@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private readonly vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
  private readonly vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
  private readonly vapidSubject = process.env.VAPID_SUBJECT?.trim() ?? '';
  private webPush: WebPushLib | null = null;
  private reminderTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.webPush = this.loadWebPush();
  }

  onModuleInit(): void {
    this.reminderTimer = setInterval(() => {
      void this.runReminderSweep();
    }, 5 * 60 * 1000);
    this.reminderTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
    }
  }

  private loadWebPush(): WebPushLib | null {
    if (!this.vapidPublicKey || !this.vapidPrivateKey || !this.vapidSubject) {
      this.logger.warn('VAPID env vars are missing; push sends are disabled');
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const webPush = require('web-push') as WebPushLib;
      webPush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
      return webPush;
    } catch (error) {
      this.logger.error(`Failed to initialize web-push: ${(error as Error).message}`);
      return null;
    }
  }

  getPublicVapidKey(): string {
    return this.vapidPublicKey;
  }

  async subscribe(userId: string, tenantId: string | null, locationId: string | null, endpoint: string, p256dh: string, auth: string, userAgent?: string): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, tenantId, locationId, endpoint, p256dh, auth, userAgent, revokedAt: null },
      update: { userId, tenantId, locationId, p256dh, auth, userAgent, revokedAt: null },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.updateMany({
      where: { endpoint, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async sendBookingConfirmation(input: { userId: string; tenantId: string; locationId: string; classTitle: string; startsAt: Date }): Promise<void> {
    const startsAt = input.startsAt.toLocaleString();
    await this.sendToUser(input.userId, input.tenantId, input.locationId, {
      title: `Booked: ${input.classTitle}`,
      body: `You are booked for ${input.classTitle} at ${startsAt}`,
      url: '/my-bookings',
    }, 'BOOKING_CONFIRMATION');
  }

  async runReminderSweep(): Promise<void> {
    const now = new Date();
    const from = new Date(now.getTime() + 115 * 60 * 1000);
    const to = new Date(now.getTime() + 125 * 60 * 1000);

    const bookings = await this.prisma.classBooking.findMany({
      where: {
        status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] },
        session: { status: ClassSessionStatus.SCHEDULED, startsAt: { gte: from, lte: to } },
      },
      include: {
        session: { include: { classTemplate: { select: { title: true } } } },
      },
      take: 250,
      orderBy: { bookedAt: 'asc' },
    });

    for (const booking of bookings) {
      const created = await this.prisma.notificationMarker.createMany({
        data: [{ markerType: REMINDER_MARKER, userId: booking.userId, sessionId: booking.sessionId, locationId: booking.locationId }],
        skipDuplicates: true,
      });

      if (!created.count) {
        continue;
      }

      await this.sendToUser(
        booking.userId,
        null,
        booking.locationId,
        {
          title: `Upcoming class: ${booking.session.classTemplate.title}`,
          body: `Starts in about 2 hours at ${booking.session.startsAt.toLocaleTimeString()}`,
          url: '/my-bookings',
        },
        'CLASS_REMINDER',
      );
    }
  }

  private async sendToUser(userId: string, tenantId: string | null, locationId: string | null, payload: PushPayload, type: string): Promise<void> {
    await this.notificationsService.createForUser({ userId, type, title: payload.title, body: payload.body });

    if (!this.webPush) {
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, revokedAt: null, tenantId: tenantId ?? undefined, locationId: locationId ?? undefined },
      take: 10,
    });

    const message = JSON.stringify(payload);
    for (const subscription of subscriptions) {
      try {
        await this.webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          message,
        );
      } catch (error) {
        const statusCode = this.extractStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.update({ where: { id: subscription.id }, data: { revokedAt: new Date() } });
          continue;
        }

        this.logger.warn(`Push send failed for ${subscription.id}: ${(error as Error).message}`);
      }
    }
  }

  private extractStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof maybeStatusCode === 'number' ? maybeStatusCode : null;
  }
}

