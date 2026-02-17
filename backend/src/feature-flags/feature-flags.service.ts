import { Injectable } from '@nestjs/common';
import { FeatureFlag, FeatureFlagScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

type UpsertFeatureFlagInput = {
  key: string;
  enabled: boolean;
  scope: FeatureFlagScope;
  tenantId?: string | null;
  locationId?: string | null;
  updatedByUserId?: string | null;
};

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService, private readonly cacheService: CacheService) {}

  async getEffectiveFlags(tenantId?: string, locationId?: string): Promise<Record<string, boolean>> {
    const cacheKey = `${tenantId ?? 'global'}:${locationId ?? 'all'}`;
    const cached = this.cacheService.get<Record<string, boolean>>('feature-flags', tenantId ?? null, cacheKey);
    if (cached) {
      return cached;
    }
    const [globalFlags, tenantFlags, locationFlags] = await Promise.all([
      this.prisma.featureFlag.findMany({ where: { scope: FeatureFlagScope.GLOBAL } }),
      tenantId
        ? this.prisma.featureFlag.findMany({ where: { scope: FeatureFlagScope.TENANT, tenantId } })
        : Promise.resolve([]),
      tenantId && locationId
        ? this.prisma.featureFlag.findMany({ where: { scope: FeatureFlagScope.LOCATION, tenantId, locationId } })
        : Promise.resolve([]),
    ]);

    const merged = new Map<string, boolean>();
    for (const entry of globalFlags) {
      merged.set(entry.key, entry.enabled);
    }
    for (const entry of tenantFlags) {
      merged.set(entry.key, entry.enabled);
    }
    for (const entry of locationFlags) {
      merged.set(entry.key, entry.enabled);
    }

    const resolved = Object.fromEntries(merged.entries());
    this.cacheService.set('feature-flags', tenantId ?? null, cacheKey, resolved, 30);
    return resolved;
  }

  listAll(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: [{ key: 'asc' }, { updatedAt: 'desc' }] });
  }

  async create(input: UpsertFeatureFlagInput): Promise<FeatureFlag> {
    const created = await this.prisma.featureFlag.create({
      data: {
        key: input.key,
        enabled: input.enabled,
        scope: input.scope,
        tenantId: input.scope === FeatureFlagScope.GLOBAL ? null : (input.tenantId ?? null),
        locationId: input.scope === FeatureFlagScope.LOCATION ? (input.locationId ?? null) : null,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    });
    this.cacheService.bust('feature-flags', input.tenantId ?? null, `${input.tenantId ?? 'global'}:${input.locationId ?? 'all'}`);
    return created;
  }

  async update(id: string, input: Partial<UpsertFeatureFlagInput>): Promise<FeatureFlag> {
    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        key: input.key,
        enabled: input.enabled,
        scope: input.scope,
        tenantId: input.scope === FeatureFlagScope.GLOBAL ? null : input.tenantId,
        locationId: input.scope === FeatureFlagScope.LOCATION ? input.locationId : null,
        updatedByUserId: input.updatedByUserId,
      },
    });
    this.cacheService.bust('feature-flags', input.tenantId ?? null, `${input.tenantId ?? 'global'}:${input.locationId ?? 'all'}`);
    return updated;
  }
}
