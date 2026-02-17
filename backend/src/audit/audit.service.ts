import { Injectable, Logger } from '@nestjs/common';
import { AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditActor = {
  userId?: string | null;
  type: AuditActorType;
};

type RequestContext = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type AuditLogInput = {
  actor?: AuditActor;
  tenantId?: string | null;
  locationId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  orgId?: string | null;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
  req?: RequestContext;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  private extractFirstHeaderValue(
    headers: Record<string, string | string[] | undefined> | undefined,
    headerName: string,
  ): string | undefined {
    const value = headers?.[headerName] ?? headers?.[headerName.toLowerCase()];
    if (!value) {
      return undefined;
    }

    return Array.isArray(value) ? value[0] : value;
  }

  async log(input: AuditLogInput): Promise<void> {
    const actorUserId = input.actor?.userId ?? input.userId ?? null;
    const actorType = input.actor?.type ?? (actorUserId ? AuditActorType.USER : AuditActorType.SYSTEM);
    const tenantId = input.tenantId ?? input.orgId ?? null;
    const targetType = input.targetType ?? input.entityType ?? 'unknown';
    const targetId = input.targetId ?? input.entityId ?? null;
    const resolvedIp =
      input.ip ??
      this.extractFirstHeaderValue(input.req?.headers, 'x-forwarded-for')?.split(',')[0]?.trim() ??
      input.req?.ip ??
      null;
    const resolvedUserAgent = input.userAgent ?? this.extractFirstHeaderValue(input.req?.headers, 'user-agent') ?? null;

    try {
      await this.prisma.auditLog.create({
        data: {
          actorType,
          actorUserId,
          tenantId,
          locationId: input.locationId ?? null,
          targetType,
          targetId,
          orgId: tenantId,
          userId: actorUserId,
          action: input.action,
          entityType: targetType,
          entityId: targetId,
          metadata: input.metadata,
          ip: resolvedIp,
          userAgent: resolvedUserAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log for action ${input.action}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listLatest(tenantId: string, limit = 50, filters?: { action?: string; actor?: string; from?: string; to?: string }) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: filters?.action || undefined,
        actorUser: filters?.actor
          ? {
              email: {
                contains: filters.actor,
                mode: 'insensitive' as const,
              },
            }
          : undefined,
        createdAt: {
          gte: filters?.from ? new Date(filters.from) : undefined,
          lte: filters?.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        actorType: true,
        action: true,
        targetType: true,
        targetId: true,
        tenantId: true,
        locationId: true,
        metadata: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }
}
