import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class SensitiveRateLimitService {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, ttlMs: number): void {
    const now = Date.now();
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
}
