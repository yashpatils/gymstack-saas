import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SensitiveRateLimitService {
  private readonly buckets = new Map<string, { count: number; resetAt: number; lastSeenAt: number }>();
  private lastPruneAt = 0;
  private static readonly PRUNE_INTERVAL_MS = 30_000;
  private readonly maxBuckets: number;

  constructor(private readonly configService: ConfigService) {
    const configuredMax = Number.parseInt(this.configService.get<string>('SENSITIVE_RATE_LIMIT_MAX_BUCKETS') ?? '10000', 10);
    this.maxBuckets = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 10_000;
  }

  // TODO: Replace in-memory limiter with Redis-backed distributed limiter for multi-instance production.
  check(key: string, limit: number, ttlMs: number): void {
    const now = Date.now();
    this.pruneExpiredBuckets(now);

    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.setBucket(key, { count: 1, resetAt: now + ttlMs, lastSeenAt: now });
      return;
    }

    if (current.count >= limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    current.lastSeenAt = now;
    this.setBucket(key, current);
  }

  getBucketCountForTesting(): number {
    return this.buckets.size;
  }

  private setBucket(key: string, bucket: { count: number; resetAt: number; lastSeenAt: number }): void {
    if (this.buckets.has(key)) {
      this.buckets.delete(key);
    }

    this.buckets.set(key, bucket);

    while (this.buckets.size > this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }
      this.buckets.delete(oldestKey);
    }
  }

  private pruneExpiredBuckets(now: number): void {
    if (now - this.lastPruneAt < SensitiveRateLimitService.PRUNE_INTERVAL_MS) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }

    this.lastPruneAt = now;
  }
}
