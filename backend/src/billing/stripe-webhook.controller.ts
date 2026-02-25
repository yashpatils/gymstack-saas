import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import { BillingService } from './billing.service';

@Controller('billing')
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @Post('webhook/stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() payload: Buffer,
    @Headers('stripe-signature') signature?: string | string[],
  ) {
    try {
      return await this.billingService.handleWebhook({
        provider: BillingProvider.STRIPE,
        payload,
        signature,
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('signature')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw error;
    }
  }

  @Post('webhook/razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Body() payload: Buffer,
    @Headers('x-razorpay-signature') signature?: string | string[],
  ) {
    try {
      return await this.billingService.handleWebhook({
        provider: BillingProvider.RAZORPAY,
        payload,
        signature,
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('signature')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw error;
    }
  }
}
