import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, PlanKey, Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PlanService } from '../billing/plan.service';
import { User } from '../users/user.model';
import { UpdateGymDto } from './dto/update-gym.dto';
import { ManageLocationManagerDto } from './dto/manage-location-manager.dto';
import { canManageLocation } from '../auth/authorization';
import { hasSupportModeContext } from '../auth/support-mode.util';
import { createHash, randomBytes } from 'crypto';
import { UpdateLocationBrandingDto } from './dto/update-location-branding.dto';
import { ConfigureLocationDomainDto } from './dto/configure-location-domain.dto';
import { BillingLifecycleService } from '../billing/billing-lifecycle.service';
import { SecurityErrors } from '../common/errors/security-errors';
import { validateTenantSlug } from '../common/slug.util';
import { CreateGymDto } from './dto/create-gym.dto';

function isSlugUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && Array.isArray(error.meta?.target)
    && (error.meta?.target as string[]).includes('slug');
}

@Injectable()
export class GymsService {
  private readonly logger = new Logger(GymsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly planService: PlanService,
    private readonly auditService: AuditService,
    private readonly billingLifecycleService: BillingLifecycleService,
  ) {}

  listGyms(orgId: string) {
    return this.prisma.gym.findMany({
      where: { orgId },
    });
  }

  async createGym(orgId: string, ownerId: string, data: CreateGymDto, qaBypass = false) {
    const validation = validateTenantSlug(data.slug);
    if (!validation.ok) {
      if (validation.reason.toLowerCase().includes('reserved')) {
        throw SecurityErrors.slugReserved();
      }
      throw SecurityErrors.slugInvalid(validation.reason);
    }

    if (!this.isValidTimezone(data.timezone)) {
      throw new BadRequestException({
        error: { code: 'TIMEZONE_INVALID', message: 'Timezone is invalid.' },
      });
    }

    const existingGym = await this.prisma.gym.findUnique({ where: { slug: validation.slug }, select: { id: true } });
    if (existingGym) {
      throw SecurityErrors.slugTaken();
    }

    await this.billingLifecycleService.assertCanCreateLocation(orgId);
    await this.planService.assertWithinLimits(orgId, 'createLocation', { qaBypass });

    let gym;
    try {
      gym = await this.prisma.$transaction(async (tx) => {
        const createdGym = await tx.gym.create({
          data: {
            name: data.name,
            slug: validation.slug,
            timezone: data.timezone,
            address: data.address,
            contactEmail: data.contactEmail,
            phone: data.phone,
            logoUrl: data.logoUrl,
            owner: { connect: { id: ownerId } },
            org: { connect: { id: orgId } },
          },
        });

        await this.ensureCreatorLocationMembership(orgId, ownerId, createdGym.id, tx);

        return createdGym;
      });
    } catch (error) {
      this.logPrismaCreateError(error, { slug: validation.slug, orgId, ownerId, context: 'createGym' });
      if (isSlugUniqueConstraintError(error)) {
        throw SecurityErrors.slugTaken();
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        throw new InternalServerErrorException({
          error: { code: 'DB_SCHEMA_MISMATCH', message: 'Database schema is out of date.' },
        });
      }
      throw error;
    }

    await this.auditService.log({
      orgId,
      userId: ownerId,
      action: 'gym.create',
      entityType: 'gym',
      entityId: gym.id,
      metadata: { name: gym.name, slug: gym.slug },
    });

    return gym;
  }

  async createGymForUser(user: User, data: CreateGymDto) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      const createdGym = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: `${data.name} Organization`,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            planKey: this.getTrialPlanKey(),
            ...this.getTrialWindow(),
          },
        });

        await tx.membership.create({
          data: {
            orgId: organization.id,
            userId: user.id,
            role: MembershipRole.TENANT_OWNER,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            orgId: organization.id,
            role: Role.USER,
          },
        });

        const validation = validateTenantSlug(data.slug);
        if (!validation.ok) {
          if (validation.reason.toLowerCase().includes('reserved')) {
            throw SecurityErrors.slugReserved();
          }
          throw SecurityErrors.slugInvalid(validation.reason);
        }

        if (!this.isValidTimezone(data.timezone)) {
          throw new BadRequestException({
            error: { code: 'TIMEZONE_INVALID', message: 'Timezone is invalid.' },
          });
        }

        const existingGym = await tx.gym.findUnique({ where: { slug: validation.slug }, select: { id: true } });
        if (existingGym) {
          throw SecurityErrors.slugTaken();
        }

        try {
          const createdGym = await tx.gym.create({
            data: {
              name: data.name,
              slug: validation.slug,
              timezone: data.timezone,
              address: data.address,
              contactEmail: data.contactEmail,
              phone: data.phone,
              logoUrl: data.logoUrl,
              owner: { connect: { id: user.id } },
              org: { connect: { id: organization.id } },
            },
          });

          await tx.membership.upsert({
            where: {
              userId_orgId_gymId_role: {
                userId: user.id,
                orgId: organization.id,
                gymId: createdGym.id,
                role: MembershipRole.TENANT_LOCATION_ADMIN,
              },
            },
            update: { status: MembershipStatus.ACTIVE },
            create: {
              orgId: organization.id,
              userId: user.id,
              gymId: createdGym.id,
              role: MembershipRole.TENANT_LOCATION_ADMIN,
              status: MembershipStatus.ACTIVE,
            },
          });

          return createdGym;
        } catch (error) {
          this.logPrismaCreateError(error, { slug: validation.slug, orgId: organization.id, ownerId: user.id, context: 'createGymForUser' });
          if (isSlugUniqueConstraintError(error)) {
            throw SecurityErrors.slugTaken();
          }
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
            throw new InternalServerErrorException({
              error: { code: 'DB_SCHEMA_MISMATCH', message: 'Database schema is out of date.' },
            });
          }
          throw error;
        }
      });

      await this.auditService.log({
        orgId: createdGym.orgId,
        userId: user.id,
        action: 'gym.create',
        entityType: 'gym',
        entityId: createdGym.id,
        metadata: { name: createdGym.name, onboarding: true },
      });

      return createdGym;
    }

    const orgId = user.activeTenantId ?? user.orgId ?? memberships[0]?.orgId;
    if (!orgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const hasOwnerMembership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!hasOwnerMembership) {
      throw new ForbiddenException('Only tenant owners can create additional locations');
    }

    return this.createGym(orgId, user.id, data, user.qaBypass === true);
  }

  private async ensureCreatorLocationMembership(
    orgId: string,
    userId: string,
    gymId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await tx.membership.upsert({
      where: {
        userId_orgId_gymId_role: {
          userId,
          orgId,
          gymId,
          role: MembershipRole.TENANT_LOCATION_ADMIN,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        orgId,
        userId,
        gymId,
        role: MembershipRole.TENANT_LOCATION_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  async checkSlugAvailability(requester: User, slugRaw: string): Promise<{ slug: string; available: boolean; reserved: boolean; validFormat: boolean; reason?: string }> {
    const orgId = requester.activeTenantId ?? requester.orgId;
    if (!orgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const validation = validateTenantSlug(slugRaw ?? '');
    if (!validation.ok) {
      return {
        slug: (slugRaw ?? '').trim().toLowerCase(),
        available: false,
        reserved: validation.reason.toLowerCase().includes('reserved'),
        validFormat: false,
        reason: validation.reason,
      };
    }

    const existing = await this.prisma.gym.findUnique({ where: { slug: validation.slug }, select: { id: true, orgId: true } });
    const available = !existing || existing.orgId === orgId;

    return {
      slug: validation.slug,
      available,
      reserved: false,
      validFormat: true,
      reason: available ? undefined : 'This slug is already in use',
    };
  }

  private getTrialPlanKey(): PlanKey {
    const configured = this.configService.get<string>('TRIAL_PLAN_KEY')?.toLowerCase();
    if (configured === PlanKey.pro || configured === PlanKey.enterprise || configured === PlanKey.starter) {
      return configured;
    }
    return PlanKey.pro;
  }

  private isValidTimezone(timezoneRaw: string): boolean {
    const timezone = timezoneRaw?.trim();
    if (!timezone) {
      return false;
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private logPrismaCreateError(
    error: unknown,
    context: { slug: string; orgId: string; ownerId: string; context: 'createGym' | 'createGymForUser' },
  ): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    this.logger.error(JSON.stringify({
      event: 'gym_create_prisma_error',
      code: error.code,
      meta: error.meta,
      message: error.message,
      ...context,
    }));
  }

  private getTrialWindow(): { trialStartedAt: Date; trialEndsAt: Date } {
    const configured = Number.parseInt(this.configService.get<string>('TRIAL_DAYS') ?? '14', 10);
    const trialDays = Number.isFinite(configured) && configured > 0 ? configured : 14;
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
    return { trialStartedAt, trialEndsAt };
  }


  async getGymForUser(id: string, user: User) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const allowed = await canManageLocation(this.prisma, user.id, user.orgId, gym.id);
    if (!allowed && !hasSupportModeContext(user, gym.orgId, gym.id)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return gym;
  }

  async updateGym(id: string, orgId: string, data: UpdateGymDto) {
    await this.billingLifecycleService.assertMutableAccess(orgId);
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    let payload: UpdateGymDto = data;
    if (data.slug !== undefined) {
      const validation = validateTenantSlug(data.slug);
      if (!validation.ok) {
        if (validation.reason.toLowerCase().includes('reserved')) {
          throw SecurityErrors.slugReserved();
        }
        throw SecurityErrors.slugInvalid(validation.reason);
      }
      payload = { ...data, slug: validation.slug };
    }

    let updatedGym;
    try {
      updatedGym = await this.prisma.gym.update({
        where: { id },
        data: payload,
      });
    } catch (error) {
      if (isSlugUniqueConstraintError(error)) {
        throw SecurityErrors.slugTaken();
      }
      throw error;
    }

    await this.auditService.log({
      orgId,
      userId: gym.ownerId,
      action: 'gym.update',
      entityType: 'gym',
      entityId: updatedGym.id,
    });

    return updatedGym;
  }

  async deleteGym(id: string, orgId: string) {
    await this.billingLifecycleService.assertMutableAccess(orgId);
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const deletedGym = await this.prisma.gym.delete({ where: { id } });

    await this.auditService.log({
      orgId,
      userId: gym.ownerId,
      action: 'gym.delete',
      entityType: 'gym',
      entityId: deletedGym.id,
    });

    return deletedGym;
  }

  async updateGymForUser(
    id: string,
    data: UpdateGymDto,
    user: User,
  ) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    const allowed = await canManageLocation(this.prisma, user.id, user.orgId, gym.id);
    if (!allowed && !hasSupportModeContext(user, gym.orgId, gym.id)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    let payload: UpdateGymDto = data;
    if (data.slug !== undefined) {
      const validation = validateTenantSlug(data.slug);
      if (!validation.ok) {
        if (validation.reason.toLowerCase().includes('reserved')) {
          throw SecurityErrors.slugReserved();
        }
        throw SecurityErrors.slugInvalid(validation.reason);
      }
      payload = { ...data, slug: validation.slug };
    }

    let updatedGym;
    try {
      updatedGym = await this.prisma.gym.update({
        where: { id },
        data: payload,
      });
    } catch (error) {
      if (isSlugUniqueConstraintError(error)) {
        throw SecurityErrors.slugTaken();
      }
      throw error;
    }

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'gym.update',
      entityType: 'gym',
      entityId: updatedGym.id,
    });

    return updatedGym;
  }

  async deleteGymForUser(id: string, user: User) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    const allowed = await canManageLocation(this.prisma, user.id, user.orgId, gym.id);
    if (!allowed && !hasSupportModeContext(user, gym.orgId, gym.id)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const deletedGym = await this.prisma.gym.delete({ where: { id } });

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'gym.delete',
      entityType: 'gym',
      entityId: deletedGym.id,
    });

    return deletedGym;
  }


  async getLocationBranding(locationId: string, user: User) {
    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const location = await this.prisma.gym.findFirst({
      where: { id: locationId, orgId: tenantId },
      select: {
        id: true,
        name: true,
        displayName: true,
        logoUrl: true,
        heroTitle: true,
        heroSubtitle: true,
        primaryColor: true,
        accentGradient: true,
        customDomain: true,
        domainVerifiedAt: true,
        orgId: true,
        org: {
          select: {
            id: true,
            whiteLabelEnabled: true,
            whiteLabelBrandingEnabled: true,
            stripePriceId: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const allowed = await canManageLocation(this.prisma, user.id, tenantId, locationId);
    if (!allowed && !hasSupportModeContext(user, tenantId, locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return {
      id: location.id,
      name: location.name,
      displayName: location.displayName,
      logoUrl: location.logoUrl,
      heroTitle: location.heroTitle,
      heroSubtitle: location.heroSubtitle,
      primaryColor: location.primaryColor,
      accentGradient: location.accentGradient,
      customDomain: location.customDomain,
      domainVerifiedAt: location.domainVerifiedAt,
      tenant: {
        id: location.org.id,
        whiteLabelEnabled: this.subscriptionGatingService.getEffectiveWhiteLabel({
          whiteLabelEnabled: Boolean(location.org.whiteLabelEnabled || location.org.whiteLabelBrandingEnabled),
          stripePriceId: location.org.stripePriceId,
          subscriptionStatus: location.org.subscriptionStatus,
        }),
      },
    };
  }

  async updateLocationBranding(locationId: string, payload: UpdateLocationBrandingDto, user: User) {
    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const location = await this.prisma.gym.findFirst({
      where: { id: locationId, orgId: tenantId },
      select: { id: true, orgId: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const allowed = await canManageLocation(this.prisma, user.id, tenantId, locationId);
    if (!allowed && !hasSupportModeContext(user, tenantId, locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.gym.update({
      where: { id: locationId },
      data: {
        displayName: payload.displayName,
        logoUrl: payload.logoUrl,
        primaryColor: payload.primaryColor,
        accentGradient: payload.accentGradient,
        heroTitle: payload.heroTitle,
        heroSubtitle: payload.heroSubtitle,
      },
      select: {
        id: true,
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentGradient: true,
        heroTitle: true,
        heroSubtitle: true,
      },
    });
  }

  async configureLocationCustomDomain(locationId: string, payload: ConfigureLocationDomainDto, user: User) {
    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const location = await this.prisma.gym.findFirst({
      where: { id: locationId, orgId: tenantId },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const allowed = await canManageLocation(this.prisma, user.id, tenantId, locationId);
    if (!allowed && !hasSupportModeContext(user, tenantId, locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const normalizedDomain = payload.customDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .split('/')[0]
      ?.replace(/\.$/, '');

    if (!normalizedDomain) {
      throw new BadRequestException('Invalid custom domain');
    }

    const domainVerificationToken = randomBytes(24).toString('base64url');

    let updated: { id: string; customDomain: string | null; domainVerificationToken: string | null; domainVerifiedAt: Date | null };
    try {
      updated = await this.prisma.gym.update({
        where: { id: locationId },
        data: {
          customDomain: normalizedDomain,
          domainVerificationToken,
          domainVerifiedAt: null,
        },
        select: {
          id: true,
          customDomain: true,
          domainVerificationToken: true,
          domainVerifiedAt: true,
        },
      });
    } catch {
      throw new BadRequestException('Custom domain is already in use');
    }

    return {
      locationId: updated.id,
      customDomain: updated.customDomain,
      status: 'pending' as const,
      txtRecord: {
        name: '_gymstack',
        value: `gymstack-verify=${domainVerificationToken}`,
      },
      instructions: 'Add this TXT record to your DNS zone. DNS changes may take time to propagate.',
    };
  }

  async requestLocationDomainVerification(
    locationId: string,
    user: User,
  ) {
    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const location = await this.prisma.gym.findFirst({
      where: { id: locationId, orgId: tenantId },
      select: { id: true, customDomain: true, domainVerificationToken: true },
    });

    if (!location || !location.customDomain || !location.domainVerificationToken) {
      throw new NotFoundException('Pending domain verification not found');
    }

    const allowed = await canManageLocation(this.prisma, user.id, tenantId, locationId);
    if (!allowed && !hasSupportModeContext(user, tenantId, locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updated = await this.prisma.gym.update({
      where: { id: locationId },
      data: {
        verificationRequestedAt: new Date(),
      },
      select: { id: true, customDomain: true, domainVerifiedAt: true },
    });

    return {
      locationId: updated.id,
      customDomain: updated.customDomain,
      status: updated.domainVerifiedAt ? ('verified' as const) : ('pending' as const),
      message: updated.domainVerifiedAt
        ? 'Domain verified.'
        : 'Verification pending. Please allow DNS propagation.',
      txtRecord: {
        name: '_gymstack',
        value: `gymstack-verify=${location.domainVerificationToken}`,
      },
      instructions: 'Add this TXT record to your DNS zone. DNS changes may take time to propagate.',
    };
  }

  async listManagers(locationId: string, user: User) {
    const location = await this.prisma.gym.findFirst({ where: { id: locationId }, select: { orgId: true } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    const owner = await this.prisma.membership.findFirst({
      where: { userId: user.id, orgId: location.orgId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!owner && !hasSupportModeContext(user, location.orgId, locationId)) {
      throw new ForbiddenException('Only tenant owners can manage managers');
    }

    return this.prisma.membership.findMany({
      where: { orgId: location.orgId, gymId: locationId, role: MembershipRole.TENANT_LOCATION_ADMIN, status: MembershipStatus.ACTIVE },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addManager(locationId: string, payload: ManageLocationManagerDto, user: User) {
    const location = await this.prisma.gym.findFirst({ where: { id: locationId }, select: { orgId: true } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    const owner = await this.prisma.membership.findFirst({
      where: { userId: user.id, orgId: location.orgId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!owner && !hasSupportModeContext(user, location.orgId, locationId)) {
      throw new ForbiddenException('Only tenant owners can add managers');
    }

    let targetUserId = payload.userId;
    if (!targetUserId && payload.email) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: payload.email.toLowerCase() }, select: { id: true } });
      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        const rawToken = randomBytes(32).toString('base64url');
        const invite = await this.prisma.locationInvite.create({
          data: {
            tenantId: location.orgId,
            locationId,
            role: MembershipRole.TENANT_LOCATION_ADMIN,
            email: payload.email.toLowerCase(),
            tokenHash: createHash('sha256').update(rawToken).digest('hex'),
            tokenPrefix: rawToken.slice(0, 6),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdByUserId: user.id,
          },
        });
        return { inviteId: invite.id, managers: await this.listManagers(locationId, user) };
      }
    }

    if (!targetUserId) {
      throw new ForbiddenException('userId or email is required');
    }

    await this.prisma.membership.upsert({
      where: { userId_orgId_gymId_role: { userId: targetUserId, orgId: location.orgId, gymId: locationId, role: MembershipRole.TENANT_LOCATION_ADMIN } },
      update: { status: MembershipStatus.ACTIVE },
      create: { userId: targetUserId, orgId: location.orgId, gymId: locationId, role: MembershipRole.TENANT_LOCATION_ADMIN, status: MembershipStatus.ACTIVE },
    });

    return { managers: await this.listManagers(locationId, user) };
  }

  async removeManager(locationId: string, userId: string, actor: User) {
    const location = await this.prisma.gym.findFirst({ where: { id: locationId }, select: { orgId: true } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    const owner = await this.prisma.membership.findFirst({
      where: { userId: actor.id, orgId: location.orgId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!owner && !hasSupportModeContext(actor, location.orgId, locationId)) {
      throw new ForbiddenException('Only tenant owners can remove managers');
    }

    await this.prisma.membership.deleteMany({
      where: { userId, orgId: location.orgId, gymId: locationId, role: MembershipRole.TENANT_LOCATION_ADMIN },
    });

    return { managers: await this.listManagers(locationId, actor) };
  }
}
