import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { BillingProvider, MembershipRole, MembershipStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from './subscription-gating.service';
import { PlanService } from './plan.service';
import { BillingProviderRegistry } from './billing-provider.registry';
import { TenantBillingStatusResponse } from './billing.types';
import { BillingLifecycleService } from './billing-lifecycle.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notifications.service';

type CheckoutPayload = {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

type WebhookPayload = {
  provider: BillingProvider;
  payload: Buffer;
  signature?: string | string[];
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly planService: PlanService,
    private readonly billingProviderRegistry: BillingProviderRegistry,
    private readonly billingLifecycleService: BillingLifecycleService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getTenantProvider(tenantId: string) {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, billingProvider: true, isDemo: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found.');
    }
    if (tenant.isDemo) {
      throw new BadRequestException('Billing is disabled in demo mode.');
    }

    return this.billingProviderRegistry.getProvider(tenant.billingProvider);
  }

  async createCheckoutSession(payload: CheckoutPayload): Promise<{ url: string }> {
    const provider = await this.getTenantProvider(payload.tenantId);
    return provider.createCheckout(payload);
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    const provider = await this.getTenantProvider(tenantId);

    if (!provider.createPortal) {
      throw new NotImplementedException('Billing portal is not available for this provider. Contact support.');
    }

    return provider.createPortal({ tenantId, returnUrl });
  }

  async getTenantBillingStatus(tenantId: string, qaBypass = false): Promise<TenantBillingStatusResponse> {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        billingProvider: true,
        billingCountry: true,
        billingPriceId: true,
        stripePriceId: true,
        subscriptionStatus: true,
        billingStatus: true,
        gracePeriodEndsAt: true,
        currentPeriodEnd: true,
        whiteLabelEnabled: true,
        isDemo: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found.');
    }
    if (tenant.isDemo) {
      throw new BadRequestException('Billing is disabled in demo mode.');
    }

    const billingStatus = await this.billingLifecycleService.refreshBillingState(tenantId);
    const accessEvaluation = this.subscriptionGatingService.evaluateTenantAccess(
      { subscriptionStatus: tenant.subscriptionStatus },
      qaBypass,
    );
    const effectivePriceId = tenant.billingPriceId ?? tenant.stripePriceId;
    const effectivePlan = await this.planService.getEffectivePlan(tenantId);
    const whiteLabelEligible = effectivePlan.whiteLabelIncluded && (effectivePlan.subscriptionStatus === 'ACTIVE' || effectivePlan.subscriptionStatus === 'TRIAL');

    return {
      provider: tenant.billingProvider,
      billingCountry: tenant.billingCountry,
      planKey: effectivePlan.key,
      planName: effectivePlan.displayName,
      subscriptionStatus: tenant.subscriptionStatus,
      billingStatus: billingStatus ?? tenant.billingStatus,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt ? tenant.gracePeriodEndsAt.toISOString() : null,
      currentPeriodEnd: tenant.currentPeriodEnd ? tenant.currentPeriodEnd.toISOString() : null,
      priceId: effectivePriceId,
      whiteLabelEligible,
      whiteLabelEnabled: tenant.whiteLabelEnabled,
      effectiveAccess: accessEvaluation.effectiveAccess,
      gatingStatus: accessEvaluation.gatingStatus,
      usage: {
        locationsUsed: effectivePlan.usage.locationsUsed,
        maxLocations: effectivePlan.maxLocations,
        staffSeatsUsed: effectivePlan.usage.staffSeatsUsed,
        maxStaffSeats: effectivePlan.maxStaffSeats,
      },
    };
  }

  async handleStripeWebhook(payload: Buffer, signature?: string | string[]) {
    return this.handleWebhook({ provider: BillingProvider.STRIPE, payload, signature });
  }

  async handleRazorpayWebhook(payload: Buffer, signature?: string | string[]) {
    return this.handleWebhook({ provider: BillingProvider.RAZORPAY, payload, signature });
  }

  private extractTenantIdFromWebhookPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const data = payload as Record<string, unknown>;
    const metadata = data.metadata as Record<string, unknown> | undefined;
    if (typeof metadata?.tenantId === 'string') {
      return metadata.tenantId;
    }

    const notes = data.notes as Record<string, unknown> | undefined;
    if (typeof notes?.tenantId === 'string') {
      return notes.tenantId;
    }

    const nestedPayload = data.payload as Record<string, unknown> | undefined;
    const subscription = nestedPayload?.subscription as { entity?: { notes?: { tenantId?: string } } } | undefined;
    const paymentLink = nestedPayload?.payment_link as { entity?: { notes?: { tenantId?: string } } } | undefined;

    return subscription?.entity?.notes?.tenantId ?? paymentLink?.entity?.notes?.tenantId ?? null;
  }

  async handleWebhook(input: WebhookPayload) {
    const provider = this.billingProviderRegistry.getProvider(input.provider);
    const event = await provider.parseWebhook(input.payload, input.signature);
    await provider.syncFromEvent(event);

    const tenantId = this.extractTenantIdFromWebhookPayload(event.payload);
    this.auditService.log({
      tenantId,
      action: 'BILLING_WEBHOOK_RECEIVED',
      targetType: 'billing_webhook',
      targetId: event.type,
      metadata: { provider: input.provider, eventType: event.type, tenantId },
    });

    if (tenantId) {
      const owners = await this.prisma.membership.findMany({
        where: { orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
        select: { userId: true },
      });
      await Promise.all(owners.map((owner) => this.notificationService.createForUser({
        tenantId,
        userId: owner.userId,
        type: NotificationType.SYSTEM,
        title: 'Billing event received',
        body: `Billing webhook processed: ${event.type}`,
        metadata: { provider: input.provider, eventType: event.type },
      })));
    }

    return { received: true };
  }

  async updateTenantProvider(
    tenantId: string,
    billingProvider: BillingProvider,
    billingCountry?: string,
    billingCurrency?: string,
  ): Promise<{ billingProvider: BillingProvider }> {
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        billingProvider,
        billingCountry: billingCountry?.toUpperCase(),
        billingCurrency: billingCurrency?.toUpperCase(),
      },
      select: { id: true },
    });

    this.logger.log(`Updated billing provider for tenant ${tenantId} to ${billingProvider}`);
    return { billingProvider };
  }
}
