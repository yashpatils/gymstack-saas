import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';

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

  getMyProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, twoStepEmailEnabled: true },
    });
  }

  updateMyProfile(userId: string, payload: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: payload.name,
      },
      select: { id: true, name: true, email: true, twoStepEmailEnabled: true },
    });
  }

  async changeMyPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      throw new ForbiddenException('Unable to update password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });

    return { ok: true };
  }

  getOrganizationSettings(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        whiteLabelEnabled: true,
        billingProvider: true,
        billingCountry: true,
        billingCurrency: true,
      },
    });
  }

  updateOrganizationSettings(organizationId: string, payload: UpdateOrganizationSettingsDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: payload.name,
        whiteLabelEnabled: payload.whiteLabelEnabled,
        billingCountry: payload.billingCountry,
        billingCurrency: payload.billingCurrency,
      },
      select: {
        id: true,
        name: true,
        whiteLabelEnabled: true,
        billingProvider: true,
        billingCountry: true,
        billingCurrency: true,
      },
    });
  }

  getLocationSettings(locationId: string) {
    return this.prisma.gym.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, timezone: true, contactEmail: true, phone: true, address: true },
    });
  }

  updateLocationSettings(locationId: string, payload: UpdateLocationSettingsDto) {
    return this.prisma.gym.update({
      where: { id: locationId },
      data: {
        name: payload.name,
        timezone: payload.timezone,
        contactEmail: payload.contactEmail,
        phone: payload.phone,
        address: payload.address,
      },
      select: { id: true, name: true, timezone: true, contactEmail: true, phone: true, address: true },
    });
  }
}
