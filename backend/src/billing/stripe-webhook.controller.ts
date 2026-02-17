import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing/webhook')
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() payload: Buffer,
    @Headers('stripe-signature') signature?: string | string[],
  ) {
    try {
      return await this.billingService.handleStripeWebhook(payload, signature);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('signature')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw error;
    }
  }

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Body() payload: Buffer,
    @Headers('x-razorpay-signature') signature?: string | string[],
  ) {
    try {
      return await this.billingService.handleRazorpayWebhook(payload, signature);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('signature')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw error;
    }
  }
}
