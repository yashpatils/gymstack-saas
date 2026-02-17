import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipRole, MembershipStatus, NotificationSeverity, NotificationType, TenantBillingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailProviderError, EmailService } from '../email/email.service';

@Injectable()
export class BillingLifecycleService {
  private readonly logger = new Logger(BillingLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  private gracePeriodDays(): number {
    const configured = Number.parseInt(this.configService.get<string>('BILLING_GRACE_PERIOD_DAYS') ?? '7', 10);
    return Number.isFinite(configured) && configured > 0 ? configured : 7;
  }

  private addDays(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  async handlePaymentFailed(tenantId: string): Promise<void> {
    const gracePeriodEndsAt = this.addDays(this.gracePeriodDays());
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: { billingStatus: TenantBillingStatus.PAST_DUE, gracePeriodEndsAt },
    });

    await this.notifyTenantOwners(tenantId, {
      title: 'Payment failed',
      body: `Your payment failed. Grace period ends on ${gracePeriodEndsAt.toLocaleDateString()}.`,
      severity: NotificationSeverity.warning,
      metadata: { billingStatus: TenantBillingStatus.PAST_DUE, gracePeriodEndsAt: gracePeriodEndsAt.toISOString() },
    });

    await this.sendTenantOwnerEmail(tenantId, 'payment_failed', 'Payment failed — update billing method', 'Payment failed for your Gymstack account. Update your card to avoid service restrictions.', '/platform/billing');
    await this.sendTenantOwnerEmail(tenantId, 'grace_period_warning', 'Grace period started', `Your account is in grace period and ends on ${gracePeriodEndsAt.toLocaleDateString()}.`, '/platform/billing');
  }

  async handlePaymentRecovered(tenantId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: { billingStatus: TenantBillingStatus.ACTIVE, gracePeriodEndsAt: null },
    });

    await this.notifyTenantOwners(tenantId, {
      title: 'Payment recovered',
      body: 'Your payment has been processed. Full access is restored.',
      severity: NotificationSeverity.info,
      metadata: { billingStatus: TenantBillingStatus.ACTIVE },
    });

    await this.sendTenantOwnerEmail(tenantId, 'payment_recovered', 'Payment recovered', 'Your payment method was charged successfully and your account is active again.', '/platform/billing');
  }

  async handleSubscriptionCanceled(tenantId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: { billingStatus: TenantBillingStatus.CANCELED, gracePeriodEndsAt: null },
    });
  }

  async refreshBillingState(tenantId: string): Promise<TenantBillingStatus | null> {
    const tenant = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { billingStatus: true, gracePeriodEndsAt: true } });
    if (!tenant) return null;

    if (tenant.billingStatus === TenantBillingStatus.PAST_DUE && tenant.gracePeriodEndsAt) {
      await this.prisma.organization.update({ where: { id: tenantId }, data: { billingStatus: TenantBillingStatus.GRACE_PERIOD } });
      return TenantBillingStatus.GRACE_PERIOD;
    }

    if (tenant.billingStatus === TenantBillingStatus.GRACE_PERIOD && tenant.gracePeriodEndsAt && tenant.gracePeriodEndsAt.getTime() <= Date.now()) {
      await this.prisma.organization.update({ where: { id: tenantId }, data: { billingStatus: TenantBillingStatus.FROZEN } });
      await this.sendTenantOwnerEmail(tenantId, 'account_frozen', 'Account restricted', 'Your account has been restricted until billing is updated.', '/platform/billing');
      return TenantBillingStatus.FROZEN;
    }

    return tenant.billingStatus;
  }

  async assertCanCreateLocation(tenantId: string): Promise<void> {
    const status = await this.refreshBillingState(tenantId);
    if (status === TenantBillingStatus.GRACE_PERIOD || status === TenantBillingStatus.FROZEN || status === TenantBillingStatus.CANCELED) {
      throw new ForbiddenException('Billing restrictions block creating new locations.');
    }
  }

  async assertCanInviteStaff(tenantId: string): Promise<void> {
    const status = await this.refreshBillingState(tenantId);
    if (status === TenantBillingStatus.GRACE_PERIOD || status === TenantBillingStatus.FROZEN || status === TenantBillingStatus.CANCELED) {
      throw new ForbiddenException('Billing restrictions block new staff invites.');
    }
  }

  async assertCanToggleWhiteLabel(tenantId: string): Promise<void> {
    const status = await this.refreshBillingState(tenantId);
    if (status === TenantBillingStatus.GRACE_PERIOD || status === TenantBillingStatus.FROZEN || status === TenantBillingStatus.CANCELED) {
      throw new ForbiddenException('Billing restrictions block white-label changes.');
    }
  }

  async assertMutableAccess(tenantId: string, allowBillingMutation = false): Promise<void> {
    const status = await this.refreshBillingState(tenantId);
    if (status === TenantBillingStatus.FROZEN && !allowBillingMutation) {
      throw new ForbiddenException('Tenant is in read-only mode due to billing restrictions.');
    }
  }

  private async notifyTenantOwners(tenantId: string, payload: { title: string; body: string; severity: NotificationSeverity; metadata?: Record<string, string> }): Promise<void> {
    const owners = await this.prisma.membership.findMany({
      where: { orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });

    await Promise.all(owners.map((owner) => this.notificationsService.createForUser({
      tenantId,
      userId: owner.userId,
      type: NotificationType.SYSTEM,
      title: payload.title,
      body: payload.body,
      severity: payload.severity,
      metadata: payload.metadata,
    })));
  }

  private async sendTenantOwnerEmail(tenantId: string, template: string, subject: string, intro: string, linkPath: string): Promise<void> {
    const owners = await this.prisma.membership.findMany({
      where: { orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { user: { select: { email: true } } },
    });

    await Promise.all(owners.map(async (owner) => {
      try {
        await this.emailService.sendTemplatedActionEmail({
          to: owner.user.email,
          template,
          subject,
          title: 'Gymstack Billing Update',
          intro,
          buttonLabel: 'Open billing',
          link: `${this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'https://gymstack.club'}${linkPath}`,
        });
      } catch (error) {
        if (error instanceof EmailProviderError) {
          this.logger.warn(`Email send failed for ${owner.user.email} (${template}): ${error.message}`);
          return;
        }
        this.logger.warn(`Email send failed for ${owner.user.email} (${template}).`);
      }
    }));
  }
}
