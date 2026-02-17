import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

type ApiRateBucket = {
  resetAt: number;
  count: number;
};

type PublicApiRequest = Request & {
  apiKeyContext?: {
    tenantId: string;
    apiKeyId: string;
    keyName: string;
  };
};

@Injectable()
export class PublicApiAuthGuard implements CanActivate {
  private readonly rateBuckets = new Map<string, ApiRateBucket>();

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublicApiRequest>();
    const rawAuthHeader = request.headers.authorization;

    if (!rawAuthHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = rawAuthHeader.slice(7).trim();
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const storedKey = await (this.prisma as any).apiKey.findUnique({
      where: { keyHash },
      select: { id: true, tenantId: true, name: true, revokedAt: true },
    });

    if (!storedKey || storedKey.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }

    this.applyRateLimit(storedKey.id);

    request.apiKeyContext = {
      tenantId: storedKey.tenantId,
      apiKeyId: storedKey.id,
      keyName: storedKey.name,
    };

    await (this.prisma as any).apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  private applyRateLimit(apiKeyId: string): void {
    const now = Date.now();
    const existingBucket = this.rateBuckets.get(apiKeyId);
    const bucket =
      existingBucket && existingBucket.resetAt > now
        ? existingBucket
        : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    bucket.count += 1;
    this.rateBuckets.set(apiKeyId, bucket);

    if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
      throw new HttpException('API key rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
