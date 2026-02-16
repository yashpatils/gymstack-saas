import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { CreateDomainDto } from './dto/create-domain.dto';
import { normalizeHostname } from './domain.util';

@Injectable()
export class DomainsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requester: User, input: CreateDomainDto) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    await this.assertManagePermission(requester.id, tenantId, input.locationId ?? null);

    const hostname = normalizeHostname(input.hostname);
    if (!hostname) throw new BadRequestException('Invalid hostname');

    const verificationToken = randomBytes(16).toString('hex');
    const domain = await this.prisma.customDomain.create({
      data: {
        tenantId,
        locationId: input.locationId ?? null,
        hostname,
        status: DomainStatus.PENDING,
        verificationToken,
        createdByUserId: requester.id,
      },
    });

    return {
      id: domain.id,
      hostname: domain.hostname,
      status: domain.status,
      locationId: domain.locationId,
      verification: {
        type: 'TXT' as const,
        name: '_gymstack-verification',
        value: verificationToken,
      },
      instructions: {
        apex: 'Use an ALIAS/ANAME (or A record per your DNS provider) to point your root domain to Vercel.',
        subdomain: 'Use a CNAME to cname.vercel-dns.com.',
      },
    };
  }

  async list(requester: User) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    return this.prisma.customDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, hostname: true, status: true, locationId: true, createdAt: true },
    });
  }

  async verify(requester: User, id: string) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId } });
    if (!domain) throw new NotFoundException('Domain not found');

    await this.assertManagePermission(requester.id, tenantId, domain.locationId);

    const updated = await this.prisma.customDomain.update({
      where: { id: domain.id },
      data: { status: DomainStatus.ACTIVE },
      select: { id: true, hostname: true, status: true, locationId: true, updatedAt: true },
    });

    return updated;
  }

  async remove(requester: User, id: string) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId } });
    if (!domain) throw new NotFoundException('Domain not found');

    await this.assertManagePermission(requester.id, tenantId, domain.locationId);

    await this.prisma.customDomain.delete({ where: { id: domain.id } });

    return { ok: true };
  }


  async requestLocationVerification(requester: User, locationId: string, hostnameInput: string) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    await this.assertManagePermission(requester.id, tenantId, locationId);

    const hostname = normalizeHostname(hostnameInput);
    if (!hostname) {
      throw new BadRequestException('Invalid hostname');
    }

    const verificationToken = randomBytes(16).toString('hex');
    const location = await this.prisma.gym.updateMany({
      where: { id: locationId, orgId: tenantId },
      data: {
        customDomain: hostname,
        domainVerificationToken: verificationToken,
        domainVerifiedAt: null,
      },
    });

    if (location.count === 0) {
      throw new NotFoundException('Location not found');
    }

    return {
      locationId,
      hostname,
      verificationToken,
      instructions: {
        txt: {
          host: `_gymstack-verification.${hostname}`,
          value: verificationToken,
        },
        cname: {
          host: hostname,
          value: 'cname.vercel-dns.com',
        },
      },
    };
  }

  async verifyLocationDomain(requester: User, locationId: string) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    await this.assertManagePermission(requester.id, tenantId, locationId);

    const location = await this.prisma.gym.findFirst({
      where: { id: locationId, orgId: tenantId },
      select: { id: true, customDomain: true, domainVerificationToken: true },
    });

    if (!location || !location.customDomain || !location.domainVerificationToken) {
      throw new NotFoundException('Pending domain verification not found');
    }

    const updated = await this.prisma.gym.update({
      where: { id: location.id },
      data: { domainVerifiedAt: new Date() },
      select: { id: true, customDomain: true, domainVerifiedAt: true },
    });

    return {
      locationId: updated.id,
      hostname: updated.customDomain,
      domainVerifiedAt: updated.domainVerifiedAt,
      mode: 'manual',
    };
  }

  private async assertManagePermission(userId: string, tenantId: string, locationId: string | null) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER },
          ...(locationId ? [{ role: MembershipRole.TENANT_LOCATION_ADMIN, gymId: locationId }] : []),
        ],
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient permissions to manage domains');
    }
  }
}
