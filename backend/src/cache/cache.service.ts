import { Injectable } from '@nestjs/common';

type CacheEntry = { value: unknown; expiresAt: number };

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();

  private buildKey(scope: string, tenantId: string | null, key: string): string {
    return `${scope}:${tenantId ?? 'global'}:${key}`;
  }

  get<T>(scope: string, tenantId: string | null, key: string): T | null {
    const finalKey = this.buildKey(scope, tenantId, key);
    const entry = this.store.get(finalKey);
    if (!entry || entry.expiresAt < Date.now()) {
      this.store.delete(finalKey);
      return null;
    }
    return entry.value as T;
  }

  set(scope: string, tenantId: string | null, key: string, value: unknown, ttlSeconds: number): void {
    this.store.set(this.buildKey(scope, tenantId, key), { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  bust(scope: string, tenantId: string | null, key: string): void {
    this.store.delete(this.buildKey(scope, tenantId, key));
  }
}
