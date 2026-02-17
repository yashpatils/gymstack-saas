import { HttpException, HttpStatus } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  it('returns 401 for bad stripe signature', async () => {
    const controller = new StripeWebhookController({
      handleStripeWebhook: async () => {
        throw new Error('Invalid stripe signature');
      },
      handleRazorpayWebhook: async () => ({ received: true }),
    } as never);

    await expect(controller.handleStripeWebhook(Buffer.from(''), 'bad')).rejects.toMatchObject<HttpException>({
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('returns 401 for bad razorpay signature', async () => {
    const controller = new StripeWebhookController({
      handleStripeWebhook: async () => ({ received: true }),
      handleRazorpayWebhook: async () => {
        throw new Error('Invalid razorpay signature');
      },
    } as never);

    await expect(controller.handleRazorpayWebhook(Buffer.from(''), 'bad')).rejects.toMatchObject<HttpException>({
      status: HttpStatus.UNAUTHORIZED,
    });
  });
});
