import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const BILLING_ACTIVE_STATUSES = new Set(['active', 'trialing']);

type TenantSubscriptionSnapshot = {
  stripePriceId: string | null;
  subscriptionStatus: string | null;
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

    return tenant.stripePriceId === proPriceId && BILLING_ACTIVE_STATUSES.has((tenant.subscriptionStatus ?? '').toLowerCase());
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
