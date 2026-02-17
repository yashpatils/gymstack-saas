import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { isActiveSubscriptionStatus, normalizeSubscriptionStatus } from './subscription-status.util';

type TenantSubscriptionSnapshot = {
  stripePriceId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  whiteLabelEnabled: boolean;
};

@Injectable()
export class SubscriptionGatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  isWhiteLabelEligible(tenant: Pick<TenantSubscriptionSnapshot, 'stripePriceId' | 'subscriptionStatus'>): boolean {
    const proPriceId = this.configService.get<string>('STRIPE_PRICE_PRO');
    if (!proPriceId) {
      return false;
    }

    return tenant.stripePriceId === proPriceId
      && isActiveSubscriptionStatus(normalizeSubscriptionStatus(tenant.subscriptionStatus));
  }

  getEffectiveWhiteLabel(tenant: TenantSubscriptionSnapshot): boolean {
    return tenant.whiteLabelEnabled && this.isWhiteLabelEligible(tenant);
  }

  async getTenantBillingSnapshot(tenantId: string): Promise<TenantSubscriptionSnapshot | null> {
    return this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        stripePriceId: true,
        subscriptionStatus: true,
        whiteLabelEnabled: true,
      },
    });
  }

  async getWhiteLabelEligibility(tenantId: string): Promise<boolean> {
    const tenant = await this.getTenantBillingSnapshot(tenantId);
    if (!tenant) {
      return false;
    }

    return this.isWhiteLabelEligible(tenant);
  }
}
