import { Body, Controller, Headers, Post } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  handleWebhook(
    @Body() payload: Buffer,
    @Headers('stripe-signature') signature?: string | string[],
  ) {
    return this.billingService.handleWebhook(payload, signature);
  }
}
