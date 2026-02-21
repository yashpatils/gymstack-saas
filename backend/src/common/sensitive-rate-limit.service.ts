import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class SensitiveRateLimitService {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private lastPruneAt = 0;
  private static readonly PRUNE_INTERVAL_MS = 30_000;

  // TODO: Replace in-memory limiter with Redis-backed distributed limiter for multi-instance production.
  check(key: string, limit: number, ttlMs: number): void {
    const now = Date.now();
    this.pruneExpiredBuckets(now);

    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + ttlMs });
      return;
    }

    if (current.count >= limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    this.buckets.set(key, current);
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
