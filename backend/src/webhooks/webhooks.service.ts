import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emitEvent(tenantId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const endpoints = await (this.prisma as any).webhookEndpoint.findMany({ where: { tenantId, active: true, events: { has: eventType } }, select: { id: true } });
    await Promise.all(endpoints.map(async (endpoint: { id: string }) => {
      const delivery = await (this.prisma as any).webhookDelivery.create({
        data: { webhookEndpointId: endpoint.id, eventType, payload: payload as Prisma.InputJsonValue, attemptCount: 0 },
        select: { id: true },
      });
      void this.processDelivery(delivery.id);
    }));
  }

  async createEndpoint(tenantId: string, input: { url: string; events: string[] }): Promise<{ id: string; secret: string }> {
    const secret = randomBytes(24).toString('hex');
    const endpoint = await (this.prisma as any).webhookEndpoint.create({
      data: { tenantId, url: input.url, events: input.events, secret, active: true },
      select: { id: true, secret: true },
    });
    return endpoint;
  }

  listEndpoints(tenantId: string) {
    return (this.prisma as any).webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async retryDelivery(tenantId: string, deliveryId: string): Promise<void> {
    const delivery = await (this.prisma as any).webhookDelivery.findFirst({ where: { id: deliveryId, webhookEndpoint: { tenantId } }, select: { id: true } });
    if (!delivery) return;
    await this.processDelivery(delivery.id);
  }

  private async processDelivery(deliveryId: string): Promise<void> {
    const delivery = await (this.prisma as any).webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhookEndpoint: true },
    });

    if (!delivery || !delivery.webhookEndpoint.active) {
      return;
    }

    const body = JSON.stringify({ eventType: delivery.eventType, payload: delivery.payload, deliveryId: delivery.id, createdAt: delivery.createdAt.toISOString() });
    const signature = createHmac('sha256', delivery.webhookEndpoint.secret).update(body).digest('hex');

    try {
      const response = await fetch(delivery.webhookEndpoint.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gymstack-signature': signature },
        body,
      });
      const responseBody = (await response.text()).slice(0, 1_500);
      await (this.prisma as any).webhookDelivery.update({ where: { id: delivery.id }, data: { responseStatus: response.status, responseBody, attemptCount: delivery.attemptCount + 1, nextRetryAt: null } });
      if (!response.ok) {
        await this.scheduleRetry(delivery.id, delivery.attemptCount + 1);
      }
    } catch (error) {
      this.logger.warn(`Webhook delivery ${delivery.id} failed: ${error instanceof Error ? error.message : String(error)}`);
      await this.scheduleRetry(delivery.id, delivery.attemptCount + 1);
    }
  }

  private async scheduleRetry(deliveryId: string, nextAttemptCount: number): Promise<void> {
    const delayMs = Math.min(2 ** nextAttemptCount * 1000, 60_000);
    const nextRetryAt = new Date(Date.now() + delayMs);
    await (this.prisma as any).webhookDelivery.update({ where: { id: deliveryId }, data: { attemptCount: nextAttemptCount, nextRetryAt } });
    setTimeout(() => {
      void this.processDelivery(deliveryId);
    }, delayMs);
  }
}
