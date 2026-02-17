import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditActorType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService, private readonly webhooksService: WebhooksService, private readonly auditService: AuditService) {}

  private getTenantId(user: { activeTenantId?: string | null }): string {
    const tenantId = user.activeTenantId;
    if (!tenantId) throw new UnauthorizedException('No active tenant selected');
    return tenantId;
  }

  async listApiKeys(user: { activeTenantId?: string | null }) {
    const tenantId = this.getTenantId(user);
    return this.prisma.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true, lastUsedAt: true, revokedAt: true } });
  }

  async createApiKey(user: { activeTenantId?: string | null; id?: string; email?: string; role?: string }, name: string): Promise<{ id: string; name: string; key: string }> {
    if (!name.trim()) throw new BadRequestException('Name is required');
    const tenantId = this.getTenantId(user);
    const plain = `gsk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(plain).digest('hex');
    const created = await this.prisma.apiKey.create({ data: { tenantId, name: name.trim(), keyHash }, select: { id: true, name: true } });
    return { ...created, key: plain };
  }

  async revokeApiKey(user: { activeTenantId?: string | null; id?: string; email?: string; role?: string }, id: string): Promise<void> {
    const tenantId = this.getTenantId(user);
    await this.prisma.apiKey.updateMany({ where: { id, tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  listWebhookEndpoints(user: { activeTenantId?: string | null }, page = 1, pageSize = 20) {
    const tenantId = this.getTenantId(user);
    return this.webhooksService.listEndpoints(tenantId, page, pageSize);
  }

  createWebhookEndpoint(user: { activeTenantId?: string | null }, input: { url: string; events: string[] }) {
    const tenantId = this.getTenantId(user);
    return this.webhooksService.createEndpoint(tenantId, input);
  }

  retryWebhookDelivery(user: { activeTenantId?: string | null }, deliveryId: string) {
    const tenantId = this.getTenantId(user);
    return this.webhooksService.retryDelivery(tenantId, deliveryId);
  }
}
