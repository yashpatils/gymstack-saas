import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'node:net';

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RedisConfig = {
  host: string;
  port: number;
  password?: string;
};

@Injectable()
export class DistributedRateLimitService {
  private readonly logger = new Logger(DistributedRateLimitService.name);
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly redisConfig = this.parseRedisUrl(process.env.REDIS_URL);
  private redisUnavailableLogged = false;

  async check(key: string, limit: number, ttlMs: number): Promise<RateLimitDecision> {
    const redisResult = await this.checkWithRedis(key, limit, ttlMs);
    if (redisResult) {
      return redisResult;
    }
    return this.checkInMemory(key, limit, ttlMs);
  }

  private async checkWithRedis(key: string, limit: number, ttlMs: number): Promise<RateLimitDecision | null> {
    if (!this.redisConfig) {
      return null;
    }

    try {
      const redisKey = `rate-limit:${key}`;
      const result = await this.executeLuaCounter(redisKey, ttlMs);
      const count = Number(result[0] ?? 0);
      const ttlRemainingMs = Math.max(Number(result[1] ?? ttlMs), 0);
      const resetAt = Date.now() + ttlRemainingMs;

      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(limit - count, 0),
        resetAt,
        retryAfterSeconds: Math.max(Math.ceil(ttlRemainingMs / 1000), 1),
      };
    } catch (error) {
      if (!this.redisUnavailableLogged) {
        this.redisUnavailableLogged = true;
        this.logger.warn(`Redis unavailable for rate limiting. Falling back to in-memory limiter. ${String(error)}`);
      }
      return null;
    }
  }

  private async executeLuaCounter(key: string, ttlMs: number): Promise<(number | string | null)[]> {
    const script = "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; local ttl = redis.call('PTTL', KEYS[1]); return {current, ttl};";
    const command = this.encodeRespArray(['EVAL', script, '1', key, String(ttlMs)]);
    const response = await this.sendRedisCommand(command);
    if (!Array.isArray(response)) {
      throw new Error('Unexpected Redis response shape.');
    }
    return response;
  }

  private async sendRedisCommand(command: string): Promise<unknown> {
    const config = this.redisConfig;
    if (!config) {
      throw new Error('Redis is not configured.');
    }

    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let buffer = '';
      let authenticated = !config.password;

      const fail = (error: unknown) => {
        socket.destroy();
        reject(error);
      };

      const tryParse = (): void => {
        const parsed = this.parseRespValue(buffer);
        if (!parsed) {
          return;
        }

        buffer = buffer.slice(parsed.bytesRead);

        if (!authenticated && config.password) {
          if (parsed.value instanceof Error) {
            fail(parsed.value);
            return;
          }
          authenticated = true;
          socket.write(command);
          return;
        }

        if (parsed.value instanceof Error) {
          fail(parsed.value);
          return;
        }

        socket.end();
        resolve(parsed.value);
      };

      socket.setTimeout(1000, () => fail(new Error('Redis command timed out.')));
      socket.on('error', fail);
      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        tryParse();
      });

      socket.connect(config.port, config.host, () => {
        if (config.password) {
          const authCommand = this.encodeRespArray(['AUTH', config.password]);
          socket.write(authCommand);
          return;
        }

        socket.write(command);
      });
    });
  }

  private encodeRespArray(parts: string[]): string {
    const encoded = parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('');
    return `*${parts.length}\r\n${encoded}`;
  }

  private parseRespValue(input: string): { value: unknown; bytesRead: number } | null {
    if (input.length < 4) return null;
    const type = input[0];
    if (type === '+' || type === '-' || type === ':') {
      const end = input.indexOf('\r\n');
      if (end === -1) return null;
      const payload = input.slice(1, end);
      if (type === '+') return { value: payload, bytesRead: end + 2 };
      if (type === '-') return { value: new Error(payload), bytesRead: end + 2 };
      return { value: Number(payload), bytesRead: end + 2 };
    }

    if (type === '$') {
      const end = input.indexOf('\r\n');
      if (end === -1) return null;
      const length = Number(input.slice(1, end));
      if (length === -1) return { value: null, bytesRead: end + 2 };
      const total = end + 2 + length + 2;
      if (input.length < total) return null;
      return { value: input.slice(end + 2, end + 2 + length), bytesRead: total };
    }

    if (type === '*') {
      const end = input.indexOf('\r\n');
      if (end === -1) return null;
      const count = Number(input.slice(1, end));
      let offset = end + 2;
      const values: unknown[] = [];
      for (let i = 0; i < count; i += 1) {
        const nested = this.parseRespValue(input.slice(offset));
        if (!nested) return null;
        values.push(nested.value);
        offset += nested.bytesRead;
      }
      return { value: values, bytesRead: offset };
    }

    return null;
  }

  private parseRedisUrl(redisUrl: string | undefined): RedisConfig | null {
    if (!redisUrl?.trim()) {
      return null;
    }

    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password || undefined,
    };
  }

  private checkInMemory(key: string, limit: number, ttlMs: number): RateLimitDecision {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + ttlMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - 1, 0),
        resetAt,
        retryAfterSeconds: Math.max(Math.ceil(ttlMs / 1000), 1),
      };
    }

    const nextCount = current.count + 1;
    this.buckets.set(key, { count: nextCount, resetAt: current.resetAt });

    return {
      allowed: nextCount <= limit,
      limit,
      remaining: Math.max(limit - nextCount, 0),
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }
}
