import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../guards/roles.guard';
import { User } from '../users/user.model';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { BillingService } from './billing.service';

type CheckoutBody = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

type PortalBody = {
  returnUrl: string;
};

@Controller('billing')
@VerifiedEmailRequired()
@UseGuards(RolesGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
  ) {}

  @Post('checkout')
  async createCheckoutSession(
    @Body() body: CheckoutBody,
    @Req() req: Request & { user?: User },
  ) {
    const user = req.user;
    const tenantId = user?.activeTenantId ?? user?.orgId;

    if (!user || !tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    if (user.activeRole !== MembershipRole.TENANT_OWNER) {
      throw new ForbiddenException('Only tenant owners can manage billing.');
    }

    const session = await this.billingService.createCheckoutSession({
      tenantId,
      priceId: body.priceId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    const userAgent = req.headers['user-agent'];
    await this.auditService.log({
      orgId: tenantId,
      userId: user.id,
      action: 'billing.checkout.created',
      entityType: 'billing',
      entityId: tenantId,
      metadata: { priceId: body.priceId },
      ip: req.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });

    return session;
  }

  @Post('portal')
  async createPortalSession(
    @Body() body: PortalBody,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    const tenantId = user?.activeTenantId ?? user?.orgId;

    if (!user || !tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    if (user.activeRole !== MembershipRole.TENANT_OWNER) {
      throw new ForbiddenException('Only tenant owners can manage billing.');
    }

    return this.billingService.createPortalSession(tenantId, body.returnUrl);
  }

  @Get('status')
  async getStatus(@Req() req: { user?: User }) {
    const user = req.user;
    const tenantId = user?.activeTenantId ?? user?.orgId;

    if (!user || !tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    return this.billingService.getTenantBillingStatus(tenantId);
  }
}
