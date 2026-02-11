import { ForbiddenException, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGatingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });

    return user?.subscriptionStatus ?? SubscriptionStatus.FREE;
  }

  async requireActiveSubscription(userId: string): Promise<void> {
    const status = await this.getSubscriptionStatus(userId);

    if (status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException(
        'An active subscription is required for this action. Please upgrade your plan.',
      );
    }
  }
}
