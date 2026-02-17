import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BillingProvider, SubscriptionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCheckoutInput, BillingPortalInput, BillingProviderAdapter, BillingWebhookEvent } from '../billing.types';
import { normalizeSubscriptionStatus } from '../subscription-status.util';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

@Injectable()
export class RazorpayBillingProvider implements BillingProviderAdapter {
  readonly name = BillingProvider.RAZORPAY;
  private readonly logger = new Logger(RazorpayBillingProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getAuthConfig(): { keyId: string; keySecret: string } {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException('Razorpay integration is disabled.');
    }

    return { keyId, keySecret };
  }

  private getAllowedPlanIds(): Set<string> {
    const starter = this.configService.get<string>('RAZORPAY_PLAN_STARTER');
    const pro = this.configService.get<string>('RAZORPAY_PLAN_PRO');
    const ids = new Set<string>();

    if (starter) ids.add(starter);
    if (pro) ids.add(pro);

    return ids;
  }

  async createCheckout(input: BillingCheckoutInput): Promise<{ url: string }> {
    const { keyId, keySecret } = this.getAuthConfig();
    const allowedPlanIds = this.getAllowedPlanIds();
    if (allowedPlanIds.size === 0) {
      throw new ServiceUnavailableException('No Razorpay plans are configured.');
    }
    if (!allowedPlanIds.has(input.priceId)) {
      throw new BadRequestException('Unsupported priceId for Razorpay.');
    }

    const tenant = await this.prisma.organization.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, isDemo: true, billingCurrency: true },
    });
    if (!tenant) throw new BadRequestException('Tenant not found.');
    if (tenant.isDemo) throw new BadRequestException('Billing is disabled in demo mode.');

    const ownerMembership = await this.prisma.membership.findFirst({
      where: { orgId: tenant.id, role: 'TENANT_OWNER', status: 'ACTIVE' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const response = await fetch(`${RAZORPAY_API}/payment_links`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        currency: tenant.billingCurrency ?? 'INR',
        accept_partial: false,
        first_min_partial_amount: 100,
        description: `GymStack ${input.priceId} plan`,
        customer: { email: ownerMembership?.user.email },
        notify: { email: true },
        reminder_enable: true,
        callback_url: input.successUrl,
        callback_method: 'get',
        notes: {
          tenantId: tenant.id,
          planId: input.priceId,
          cancelUrl: input.cancelUrl,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(`Failed to create Razorpay checkout: ${body}`);
    }

    const payload = (await response.json()) as { id?: string; short_url?: string };
    if (!payload.id || !payload.short_url) {
      throw new ServiceUnavailableException('Razorpay checkout URL is unavailable.');
    }

    await this.prisma.organization.update({
      where: { id: tenant.id },
      data: {
        billingProvider: BillingProvider.RAZORPAY,
        billingSubscriptionId: payload.id,
        billingPriceId: input.priceId,
        providerMetadata: {
          razorpayPaymentLinkId: payload.id,
        },
      },
    });

    return { url: payload.short_url };
  }

  async createPortal(_input: BillingPortalInput): Promise<{ url: string }> {
    throw new BadRequestException('Razorpay does not support self-serve portal. Contact support to manage billing.');
  }

  async parseWebhook(payload: Buffer, signature?: string | string[]): Promise<BillingWebhookEvent> {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Missing RAZORPAY_WEBHOOK_SECRET.');
    }

    if (!signature) {
      throw new BadRequestException('Missing Razorpay signature header.');
    }

    const provided = Array.isArray(signature) ? signature[0] : signature;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    const providedBuffer = Buffer.from(provided, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      providedBuffer.length !== expectedBuffer.length
      || !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid Razorpay webhook signature.');
    }

    const parsed = JSON.parse(payload.toString('utf8')) as { event?: string; payload?: Record<string, unknown> };
    return {
      provider: BillingProvider.RAZORPAY,
      type: parsed.event ?? 'unknown',
      payload: parsed,
    };
  }

  async syncFromEvent(event: BillingWebhookEvent): Promise<void> {
    const parsed = event.payload as {
      payload?: {
        payment_link?: { entity?: { id?: string; notes?: { tenantId?: string; planId?: string } } };
        subscription?: { entity?: { id?: string; status?: string; current_end?: number; notes?: { tenantId?: string; planId?: string } } };
      };
      event?: string;
    };

    const paymentLink = parsed.payload?.payment_link?.entity;
    const subscription = parsed.payload?.subscription?.entity;
    const tenantId = paymentLink?.notes?.tenantId ?? subscription?.notes?.tenantId;

    if (!tenantId) {
      this.logger.warn(`Ignoring Razorpay event without tenant id: ${event.type}`);
      return;
    }

    const rawStatus = subscription?.status ?? (event.type === 'payment_link.paid' ? 'active' : 'past_due');
    const normalizedStatus = normalizeSubscriptionStatus(rawStatus);
    const nextPriceId = paymentLink?.notes?.planId ?? subscription?.notes?.planId ?? null;

    await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        billingProvider: BillingProvider.RAZORPAY,
        billingSubscriptionId: subscription?.id ?? paymentLink?.id ?? null,
        billingPriceId: nextPriceId,
        subscriptionStatus: normalizedStatus,
        currentPeriodEnd: subscription?.current_end ? new Date(subscription.current_end * 1000) : null,
        billingCurrency: 'INR',
        providerMetadata: {
          razorpayEvent: event.type,
          razorpayRawStatus: rawStatus,
        },
        upgradedAt: normalizedStatus === SubscriptionStatus.ACTIVE ? new Date() : undefined,
      },
    });
  }
}
