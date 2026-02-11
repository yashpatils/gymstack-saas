import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type FeatureFlags = {
  enableBilling: boolean;
  enableInvites: boolean;
  enableAudit: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableBilling: false,
  enableInvites: false,
  enableAudit: true,
};

type SettingRow = {
  key: string;
  value: unknown;
  updatedAt: Date;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<FeatureFlags> {
    const rows = await this.prisma.$queryRaw<SettingRow[]>`
      SELECT "key", "value", "updatedAt"
      FROM "Setting"
      WHERE "key" IN ('enableBilling', 'enableInvites', 'enableAudit')
    `;

    return rows.reduce<FeatureFlags>((acc, row) => {
      if (row.key in acc && typeof row.value === 'boolean') {
        acc[row.key as keyof FeatureFlags] = row.value;
      }

      return acc;
    }, { ...DEFAULT_FEATURE_FLAGS });
  }

  async updateSettings(nextValues: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const entries = Object.entries(nextValues) as Array<[
      keyof FeatureFlags,
      boolean | undefined,
    ]>;

    await this.prisma.$transaction(
      entries
        .filter(([, value]) => typeof value === 'boolean')
        .map(([key, value]) =>
          this.prisma.$executeRaw`
            INSERT INTO "Setting" ("key", "value", "updatedAt")
            VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
            ON CONFLICT ("key")
            DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
          `,
        ),
    );

    return this.getSettings();
  }
}
