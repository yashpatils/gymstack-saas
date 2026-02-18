import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, PlanKey, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type EffectivePlan = {
  key: PlanKey;
  displayName: string;
  stripePriceId: string | null;
  maxLocations: number;
  maxStaffSeats: number;
  whiteLabelIncluded: boolean;
  subscriptionStatus: SubscriptionStatus;
  usage: {
    locationsUsed: number;
    staffSeatsUsed: number;
  };
};

type LimitErrorCode =
  | 'LIMIT_LOCATIONS_REACHED'
  | 'LIMIT_STAFF_SEATS_REACHED'
  | 'UPGRADE_REQUIRED'
  | 'SUBSCRIPTION_INACTIVE';

type PlanLimitEvaluation = {
  allowed: boolean;
  wouldBeBlocked: boolean;
  reasonCode: LimitErrorCode | 'OK';
};

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  private isActive(status: SubscriptionStatus): boolean {
    return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;
  }

  async getEffectivePlan(tenantId: string): Promise<EffectivePlan> {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        planOverride: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const plan = await this.prisma.planDefinition.findFirst({
      where: {
        OR: [
          { key: tenant.planKey },
          ...(tenant.stripePriceId ? [{ stripePriceId: tenant.stripePriceId }] : []),
          ...(tenant.billingPriceId ? [{ stripePriceId: tenant.billingPriceId }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const fallbackPlan = await this.prisma.planDefinition.findUnique({ where: { key: PlanKey.starter } });
    const resolvedPlan = plan ?? fallbackPlan;
    if (!resolvedPlan) {
      throw new NotFoundException('Plan definitions are missing');
    }

    const [locationsUsed, staffSeatsUsed] = await Promise.all([
      this.prisma.gym.count({ where: { orgId: tenantId } }),
      this.prisma.membership.count({
        where: {
          orgId: tenantId,
          status: MembershipStatus.ACTIVE,
          role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH] },
        },
      }),
    ]);

    return {
      key: resolvedPlan.key,
      displayName: resolvedPlan.displayName,
      stripePriceId: resolvedPlan.stripePriceId,
      maxLocations: tenant.planOverride?.maxLocationsOverride ?? resolvedPlan.maxLocations,
      maxStaffSeats: tenant.planOverride?.maxStaffSeatsOverride ?? resolvedPlan.maxStaffSeats,
      whiteLabelIncluded: tenant.planOverride?.whiteLabelOverride ?? resolvedPlan.whiteLabelIncluded,
      subscriptionStatus: tenant.subscriptionStatus,
      usage: {
        locationsUsed,
        staffSeatsUsed,
      },
    };
  }

  async isFeatureAllowed(tenantId: string, featureKey: 'whiteLabel'): Promise<boolean> {
    const plan = await this.getEffectivePlan(tenantId);
    if (featureKey === 'whiteLabel') {
      return plan.whiteLabelIncluded && this.isActive(plan.subscriptionStatus);
    }
    return false;
  }

  private throwLimitError(code: LimitErrorCode, message: string, status: HttpStatus): never {
    throw new HttpException({ code, message }, status);
  }

  async assertWithinLimits(
    tenantId: string,
    actionKey: 'createLocation' | 'inviteStaff' | 'enableWhiteLabel',
    options?: { qaBypass?: boolean },
  ): Promise<PlanLimitEvaluation> {
    const plan = await this.getEffectivePlan(tenantId);
    const qaBypass = options?.qaBypass === true;

    const evaluate = (wouldBeBlocked: boolean, reasonCode: LimitErrorCode | 'OK'): PlanLimitEvaluation => ({
      allowed: qaBypass ? true : !wouldBeBlocked,
      wouldBeBlocked,
      reasonCode,
    });

    if (actionKey === 'createLocation') {
      if (plan.usage.locationsUsed >= plan.maxLocations) {
        const evaluation = evaluate(true, 'LIMIT_LOCATIONS_REACHED');
        if (!qaBypass) {
          this.throwLimitError('LIMIT_LOCATIONS_REACHED', 'Location limit reached for current plan.', HttpStatus.PAYMENT_REQUIRED);
        }
        return evaluation;
      }
      return evaluate(false, 'OK');
    }

    if (actionKey === 'inviteStaff') {
      if (plan.usage.staffSeatsUsed >= plan.maxStaffSeats) {
        const evaluation = evaluate(true, 'LIMIT_STAFF_SEATS_REACHED');
        if (!qaBypass) {
          this.throwLimitError('LIMIT_STAFF_SEATS_REACHED', 'Staff seat limit reached for current plan.', HttpStatus.PAYMENT_REQUIRED);
        }
        return evaluation;
      }
      return evaluate(false, 'OK');
    }

    if (!this.isActive(plan.subscriptionStatus)) {
      const evaluation = evaluate(true, 'SUBSCRIPTION_INACTIVE');
      if (!qaBypass) {
        this.throwLimitError('SUBSCRIPTION_INACTIVE', 'Subscription must be active or trialing.', HttpStatus.PAYMENT_REQUIRED);
      }
      return evaluation;
    }

    if (!plan.whiteLabelIncluded) {
      const evaluation = evaluate(true, 'UPGRADE_REQUIRED');
      if (!qaBypass) {
        this.throwLimitError('UPGRADE_REQUIRED', 'Upgrade required to enable white-label.', HttpStatus.PAYMENT_REQUIRED);
      }
      return evaluation;
    }

    return evaluate(false, 'OK');
  }
}
