import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { UpdateGymDto } from './dto/update-gym.dto';
import { ManageLocationManagerDto } from './dto/manage-location-manager.dto';
import { canManageLocation } from '../auth/authorization';
import { hasSupportModeContext } from '../auth/support-mode.util';
import { createHash, randomBytes } from 'crypto';
import { UpdateLocationBrandingDto } from './dto/update-location-branding.dto';
import { ConfigureLocationDomainDto } from './dto/configure-location-domain.dto';
import { VerifyLocationDomainRequestDto } from './dto/verify-location-domain-request.dto';

function toGymSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gym';
}

@Injectable()
export class GymsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly auditService: AuditService,
  ) {}

  listGyms(orgId: string) {
    return this.prisma.gym.findMany({
      where: { orgId },
    });
  }

  async createGym(orgId: string, ownerId: string, name: string) {
    const gym = await this.prisma.gym.create({
      data: {
        name,
        slug: `${toGymSlug(name)}-${Date.now().toString().slice(-6)}`,
        owner: { connect: { id: ownerId } },
        org: { connect: { id: orgId } },
      },
    });

    await this.auditService.log({
      orgId,
      userId: ownerId,
      action: 'gym.create',
      entityType: 'gym',
      entityId: gym.id,
      metadata: { name: gym.name },
    });

    return gym;
  }

  async createGymForUser(user: User, name: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      const createdGym = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: `${name} Organization` },
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

        return tx.gym.create({
          data: {
            name,
            slug: `${toGymSlug(name)}-${Date.now().toString().slice(-6)}`,
            owner: { connect: { id: user.id } },
            org: { connect: { id: organization.id } },
          },
        });
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

    return this.createGym(orgId, user.id, name);
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
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const updatedGym = await this.prisma.gym.update({
      where: { id },
      data,
    });

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

    const updatedGym = await this.prisma.gym.update({
      where: { id },
      data,
    });

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
        whiteLabelEnabled: Boolean(location.org.whiteLabelEnabled || location.org.whiteLabelBrandingEnabled),
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
      domainVerifiedAt: updated.domainVerifiedAt,
      dnsInstructions: {
        txtRecord: {
          type: 'TXT' as const,
          name: normalizedDomain,
          value: `gymstack-verify=${domainVerificationToken}`,
        },
        cnameGuidance: 'Optional: point your custom domain CNAME to cname.vercel-dns.com if your DNS provider supports it.',
      },
    };
  }

  async requestLocationDomainVerification(
    locationId: string,
    user: User,
    payload: VerifyLocationDomainRequestDto = {},
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

    const verifiedAt = payload.manualVerify ? new Date() : null;
    const updated = await this.prisma.gym.update({
      where: { id: locationId },
      data: {
        verificationRequestedAt: new Date(),
        domainVerifiedAt: verifiedAt,
      },
      select: { id: true, customDomain: true, domainVerifiedAt: true, verificationRequestedAt: true },
    });

    return {
      locationId: updated.id,
      customDomain: updated.customDomain,
      domainVerifiedAt: updated.domainVerifiedAt,
      verificationRequestedAt: updated.verificationRequestedAt,
      status: updated.domainVerifiedAt ? ('verified' as const) : ('pending_verification' as const),
      dnsInstructions: {
        txtRecord: {
          type: 'TXT' as const,
          name: updated.customDomain,
          value: `gymstack-verify=${location.domainVerificationToken}`,
        },
        cnameGuidance: 'Optional: point your custom domain CNAME to cname.vercel-dns.com if your DNS provider supports it.',
      },
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
