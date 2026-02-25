import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientMembershipStatus, MembershipPlan, MembershipPlanInterval, MembershipRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { AssignClientMembershipDto } from './dto/assign-client-membership.dto';
import { UpdateClientMembershipDto } from './dto/update-client-membership.dto';
import { User } from '../users/user.model';
import { ClientMembershipDto, MembershipPlanDto } from './location-memberships.types';

type AuthUser = User & {
  activeTenantId?: string;
  activeGymId?: string;
  supportMode?: {
    tenantId: string;
    locationId?: string;
  };
};

@Injectable()
export class LocationMembershipsService {
  constructor(private readonly prisma: PrismaService) {}


  async listPlansForGym(user: AuthUser, gymId: string): Promise<MembershipPlanDto[]> {
    const tenantId = this.requireTenantContext(user);
    await this.assertAdminAccess(user, tenantId, gymId);

    const plans = await this.prisma.membershipPlan.findMany({
      where: { locationId: gymId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return plans.map((plan) => this.toPlanDto(plan));
  }

  async createPlanForGym(user: AuthUser, gymId: string, input: CreateMembershipPlanDto): Promise<MembershipPlanDto> {
    const tenantId = this.requireTenantContext(user);
    await this.assertAdminAccess(user, tenantId, gymId);

    const createdPlan = await this.prisma.membershipPlan.create({
      data: {
        locationId: gymId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: input.priceCents ?? null,
        interval: input.interval,
        isActive: input.isActive ?? true,
      },
    });

    return this.toPlanDto(createdPlan);
  }

  async updatePlanForGym(user: AuthUser, gymId: string, planId: string, input: UpdateMembershipPlanDto): Promise<MembershipPlanDto> {
    const tenantId = this.requireTenantContext(user);
    await this.assertAdminAccess(user, tenantId, gymId);

    const existing = await this.prisma.membershipPlan.findFirst({ where: { id: planId, locationId: gymId } });
    if (!existing) {
      throw new NotFoundException('Membership plan not found');
    }

    const plan = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        ...(typeof input.name === 'string' ? { name: input.name.trim() } : {}),
        ...(typeof input.description === 'string' ? { description: input.description.trim() || null } : {}),
        ...(typeof input.priceCents === 'number' ? { priceCents: input.priceCents } : {}),
        ...(typeof input.interval === 'string' ? { interval: input.interval as MembershipPlanInterval } : {}),
        ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
      },
    });

    return this.toPlanDto(plan);
  }

  async listPlans(user: AuthUser): Promise<MembershipPlanDto[]> {
    const { tenantId, locationId } = this.requireLocationContext(user);
    await this.assertStaffAccess(user, tenantId, locationId);

    const plans = await this.prisma.membershipPlan.findMany({
      where: { locationId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return plans.map((plan) => this.toPlanDto(plan));
  }

  async createPlan(user: AuthUser, input: CreateMembershipPlanDto): Promise<MembershipPlanDto> {
    const { tenantId, locationId } = this.requireLocationContext(user);
    await this.assertStaffAccess(user, tenantId, locationId);

    const createdPlan = await this.prisma.membershipPlan.create({
      data: {
        locationId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: input.priceCents ?? null,
        interval: input.interval,
        isActive: input.isActive ?? true,
      },
    });

    return this.toPlanDto(createdPlan);
  }

  async updatePlan(user: AuthUser, planId: string, input: UpdateMembershipPlanDto): Promise<MembershipPlanDto> {
    const { tenantId, locationId } = this.requireLocationContext(user);
    await this.assertStaffAccess(user, tenantId, locationId);

    const existing = await this.prisma.membershipPlan.findFirst({ where: { id: planId, locationId } });
    if (!existing) {
      throw new NotFoundException('Membership plan not found');
    }

    const plan = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        ...(typeof input.name === 'string' ? { name: input.name.trim() } : {}),
        ...(typeof input.description === 'string' ? { description: input.description.trim() || null } : {}),
        ...(typeof input.priceCents === 'number' ? { priceCents: input.priceCents } : {}),
        ...(typeof input.interval === 'string' ? { interval: input.interval as MembershipPlanInterval } : {}),
        ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
      },
    });

    return this.toPlanDto(plan);
  }

  async getClientMembershipForStaff(user: AuthUser, clientUserId: string): Promise<ClientMembershipDto | null> {
    const { tenantId, locationId } = this.requireLocationContext(user);
    await this.assertStaffAccess(user, tenantId, locationId);
    await this.assertUserIsClientInLocation(clientUserId, locationId);

    const membership = await this.prisma.clientMembership.findFirst({
      where: { userId: clientUserId, locationId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return membership ? this.toClientMembershipDto(membership) : null;
  }

  async assignMembershipToClient(user: AuthUser, clientUserId: string, input: AssignClientMembershipDto): Promise<ClientMembershipDto> {
    const { tenantId, locationId } = this.requireLocationContext(user);
    await this.assertStaffAccess(user, tenantId, locationId);
    await this.assertUserIsClientInLocation(clientUserId, locationId);

    return this.createMembershipRecord(user.id, clientUserId, locationId, input);
  }

  async assignMembershipToClientForGym(user: AuthUser, gymId: string, clientUserId: string, input: AssignClientMembershipDto): Promise<ClientMembershipDto> {
    const tenantId = this.requireTenantContext(user);
    await this.assertAdminAccess(user, tenantId, gymId);
    await this.assertUserIsClientInLocation(clientUserId, gymId);

    return this.createMembershipRecord(user.id, clientUserId, gymId, input);
  }

  async updateClientMembership(user: AuthUser, membershipId: string, input: UpdateClientMembershipDto): Promise<ClientMembershipDto> {
    const tenantId = this.requireTenantContext(user);

    const membership = await this.prisma.clientMembership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    });

    if (!membership || !membership.locationId) {
      throw new NotFoundException('Client membership not found');
    }

    await this.assertAdminAccess(user, tenantId, membership.locationId);

    const nextStatus = input.status;
    if (!input.adminOverride && !this.isValidStatusTransition(membership.status, nextStatus)) {
      throw new BadRequestException(`Invalid status transition from ${membership.status} to ${nextStatus}`);
    }

    const now = new Date();
    const shouldSetCanceledAt = nextStatus === ClientMembershipStatus.canceled;
    const shouldSetEndAt = nextStatus === ClientMembershipStatus.canceled || nextStatus === ClientMembershipStatus.paused;

    await this.prisma.$transaction(async (tx) => {
      if (this.isLiveStatus(nextStatus)) {
        const existingLiveMembership = await tx.clientMembership.findFirst({
          where: {
            id: { not: membership.id },
            userId: membership.userId,
            locationId: membership.locationId,
            status: { in: [ClientMembershipStatus.active, ClientMembershipStatus.trialing] },
          },
          select: { id: true },
        });

        if (existingLiveMembership) {
          await tx.clientMembership.update({
            where: { id: existingLiveMembership.id },
            data: {
              status: ClientMembershipStatus.canceled,
              canceledAt: now,
              endAt: now,
            },
          });
        }
      }

      await tx.clientMembership.update({
        where: { id: membership.id },
        data: {
          status: nextStatus,
          canceledAt: shouldSetCanceledAt ? now : null,
          endAt: shouldSetEndAt ? now : (nextStatus === ClientMembershipStatus.active ? null : membership.endAt),
        },
      });
    });

    const updated = await this.prisma.clientMembership.findUnique({
      where: { id: membership.id },
      include: { plan: true },
    });

    if (!updated) {
      throw new NotFoundException('Client membership not found');
    }

    return this.toClientMembershipDto(updated);
  }

  async getMyMembership(user: AuthUser): Promise<ClientMembershipDto | null> {
    const { locationId } = this.requireLocationContext(user);
    await this.assertClientAccess(user.id, locationId);

    const membership = await this.prisma.clientMembership.findFirst({
      where: { userId: user.id, locationId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return membership ? this.toClientMembershipDto(membership) : null;
  }

  async assertClientHasActiveMembership(user: AuthUser): Promise<void> {
    const { locationId } = this.requireLocationContext(user);
    await this.assertClientAccess(user.id, locationId);

    const membership = await this.prisma.clientMembership.findFirst({
      where: {
        userId: user.id,
        locationId,
        status: { in: [ClientMembershipStatus.active, ClientMembershipStatus.trialing] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      throw new ForbiddenException('Active membership is required for this action');
    }
  }

  private requireLocationContext(user: AuthUser): { tenantId: string; locationId: string } {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId;
    const locationId = user.supportMode?.locationId ?? user.activeGymId;

    if (!tenantId || !locationId) {
      throw new ForbiddenException('activeLocationId context is required');
    }

    return { tenantId, locationId };
  }

  private requireTenantContext(user: AuthUser): string {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId;
    if (!tenantId) {
      throw new ForbiddenException('activeTenantId context is required');
    }
    return tenantId;
  }

  private async assertStaffAccess(user: AuthUser, tenantId: string, locationId: string): Promise<void> {
    if (user.supportMode?.tenantId === tenantId && user.supportMode?.locationId === locationId && user.isPlatformAdmin) {
      return;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        gymId: locationId,
        userId: user.id,
        status: 'ACTIVE',
        role: { in: [MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH] },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Staff or admin access is required for this location');
    }
  }

  private async assertAdminAccess(user: AuthUser, tenantId: string, locationId: string): Promise<void> {
    if (user.supportMode?.tenantId === tenantId && user.supportMode?.locationId === locationId && user.isPlatformAdmin) {
      return;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        gymId: locationId,
        userId: user.id,
        status: 'ACTIVE',
        role: MembershipRole.TENANT_LOCATION_ADMIN,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Location admin access is required for this action');
    }
  }

  private async createMembershipRecord(actorUserId: string, clientUserId: string, locationId: string, input: AssignClientMembershipDto): Promise<ClientMembershipDto> {
    let resolvedPlanId: string | null = null;
    if (input.planId) {
      const plan = await this.prisma.membershipPlan.findFirst({
        where: { id: input.planId, locationId },
      });
      if (!plan) {
        throw new BadRequestException('Invalid planId for current location');
      }
      resolvedPlanId = plan.id;
    }

    const nextStatus = input.status ?? ClientMembershipStatus.active;
    const startAt = input.startAt ? new Date(input.startAt) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt value');
    }

    const { id } = await this.prisma.$transaction(async (tx) => {
      const existingActiveMembership = await tx.clientMembership.findFirst({
        where: {
          userId: clientUserId,
          locationId,
          status: { in: [ClientMembershipStatus.active, ClientMembershipStatus.trialing] },
        },
      });

      if (existingActiveMembership) {
        await tx.clientMembership.update({
          where: { id: existingActiveMembership.id },
          data: {
            status: ClientMembershipStatus.canceled,
            endAt: startAt,
            canceledAt: new Date(),
          },
        });
      }

      const endAt = nextStatus === ClientMembershipStatus.trialing && typeof input.trialDays === 'number'
        ? this.addDays(startAt, input.trialDays)
        : null;

      return tx.clientMembership.create({
        data: {
          userId: clientUserId,
          locationId,
          planId: resolvedPlanId,
          status: nextStatus,
          startAt,
          endAt,
          createdByUserId: actorUserId,
        },
      });
    });

    const createdMembership = await this.prisma.clientMembership.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!createdMembership) {
      throw new NotFoundException('Membership creation failed');
    }

    return this.toClientMembershipDto(createdMembership);
  }

  private isLiveStatus(status: ClientMembershipStatus): boolean {
    return status === ClientMembershipStatus.active || status === ClientMembershipStatus.trialing;
  }

  private isValidStatusTransition(current: ClientMembershipStatus, next: ClientMembershipStatus): boolean {
    if (current === next) {
      return true;
    }

    const allowedTransitions: Record<ClientMembershipStatus, ClientMembershipStatus[]> = {
      [ClientMembershipStatus.active]: [ClientMembershipStatus.paused, ClientMembershipStatus.canceled, ClientMembershipStatus.past_due],
      [ClientMembershipStatus.paused]: [ClientMembershipStatus.active, ClientMembershipStatus.canceled],
      [ClientMembershipStatus.canceled]: [],
      [ClientMembershipStatus.trialing]: [ClientMembershipStatus.active, ClientMembershipStatus.paused, ClientMembershipStatus.canceled, ClientMembershipStatus.past_due],
      [ClientMembershipStatus.past_due]: [ClientMembershipStatus.active, ClientMembershipStatus.paused, ClientMembershipStatus.canceled],
    };

    return allowedTransitions[current].includes(next);
  }

  private async assertClientAccess(userId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        gymId: locationId,
        role: MembershipRole.CLIENT,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Client membership not found for active location');
    }
  }

  private async assertUserIsClientInLocation(userId: string, locationId: string): Promise<void> {
    const clientMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        gymId: locationId,
        role: MembershipRole.CLIENT,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!clientMembership) {
      throw new BadRequestException('User is not an active client in this location');
    }
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private toPlanDto(plan: MembershipPlan): MembershipPlanDto {
    return {
      id: plan.id,
      locationId: plan.locationId,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      interval: plan.interval,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private toClientMembershipDto(
    membership: Prisma.ClientMembershipGetPayload<{ include: { plan: true } }>,
  ): ClientMembershipDto {
    return {
      id: membership.id,
      userId: membership.userId,
      locationId: membership.locationId,
      planId: membership.planId,
      status: membership.status,
      startAt: membership.startAt.toISOString(),
      endAt: membership.endAt?.toISOString() ?? null,
      canceledAt: membership.canceledAt?.toISOString() ?? null,
      createdByUserId: membership.createdByUserId,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
      plan: membership.plan
        ? {
            id: membership.plan.id,
            name: membership.plan.name,
            description: membership.plan.description,
            priceCents: membership.plan.priceCents,
            interval: membership.plan.interval,
            isActive: membership.plan.isActive,
          }
        : null,
    };
  }
}
