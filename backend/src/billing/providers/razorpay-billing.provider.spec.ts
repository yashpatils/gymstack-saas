import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayBillingProvider } from './razorpay-billing.provider';

describe('RazorpayBillingProvider webhook verification', () => {
  const payload = Buffer.from(JSON.stringify({ event: 'payment_link.paid', payload: {} }), 'utf8');

  function createProvider(secret: string) {
    const config = {
      get: (key: string) => (key === 'RAZORPAY_WEBHOOK_SECRET' ? secret : undefined),
    } as ConfigService;
    const prisma = {} as PrismaService;
    return new RazorpayBillingProvider(config, prisma);
  }

  it('throws on invalid signature', async () => {
    const provider = createProvider('secret');

    await expect(provider.parseWebhook(payload, 'invalid')).rejects.toBeInstanceOf(BadRequestException);
  });
});
