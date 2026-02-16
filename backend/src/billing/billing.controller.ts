import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { BillingService } from './billing.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

type CreateCustomerBody = {
  email: string;
  name?: string;
};

type CreateSubscriptionBody = {
  customerId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

type CreateCheckoutBody = {
  userId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
  ) {}

  @Post('create-customer')
  @VerifiedEmailRequired()
@UseGuards(RolesGuard)
  @Roles(UserRole.Owner, UserRole.Admin)
  async createCustomer(@Body() body: CreateCustomerBody) {
    const customer = await this.billingService.createCustomer(
      body.email,
      body.name,
    );
    return { customerId: customer.id };
  }

  @Post('create-subscription')
  @VerifiedEmailRequired()
@UseGuards(RolesGuard)
  @Roles(UserRole.Owner, UserRole.Admin)
  async createSubscription(@Body() body: CreateSubscriptionBody) {
    const session = await this.billingService.createSubscription(body);
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  @Post('checkout')
  @VerifiedEmailRequired()
@UseGuards(RolesGuard)
  @Roles(UserRole.Owner, UserRole.Admin)
  async createCheckoutSession(
    @Body() body: CreateCheckoutBody,
    @Req() req: Request & { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const userAgent = req.headers['user-agent'];

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'billing.checkout_attempt',
      entityType: 'billing',
      entityId: body.userId,
      metadata: {
        priceId: body.priceId,
      },
      ip: req.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });

    const session = await this.billingService.createCheckoutSession(body);
    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      customerId: session.customer,
    };
  }

  @Get('status/:userId')
  @VerifiedEmailRequired()
@UseGuards(RolesGuard)
  @Roles(UserRole.Owner, UserRole.Admin)
  getSubscriptionStatus(@Param('userId') userId: string) {
    return this.billingService.getSubscriptionStatus(userId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature?: string | string[],
  ) {
    const payload = request.body as Buffer;
    return this.billingService.handleWebhook(payload, signature);
  }
}
