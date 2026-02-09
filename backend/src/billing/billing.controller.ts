import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';

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

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('create-customer')
  async createCustomer(@Body() body: CreateCustomerBody) {
    const customer = await this.billingService.createCustomer(
      body.email,
      body.name,
    );
    return { customerId: customer.id };
  }

  @Post('create-subscription')
  async createSubscription(@Body() body: CreateSubscriptionBody) {
    const session = await this.billingService.createSubscription(body);
    return { checkoutUrl: session.url, sessionId: session.id };
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
