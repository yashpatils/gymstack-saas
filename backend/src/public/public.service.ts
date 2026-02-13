import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeHostname } from '../domains/domain.util';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocationBySlug(slug: string) {
    const location = await this.prisma.gym.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        timezone: true,
        address: true,
        logoUrl: true,
        accentColor: true,
        heroImageUrl: true,
        orgId: true,
      },
    });

    if (!location) throw new NotFoundException('Location not found');

    return {
      tenantId: location.orgId,
      location: {
        id: location.id,
        slug: location.slug,
        name: location.name,
        displayName: location.displayName,
        timezone: location.timezone,
        address: location.address,
      },
      branding: {
        logoUrl: location.logoUrl,
        accentColor: location.accentColor,
        heroImageUrl: location.heroImageUrl,
      },
    };
  }

  async resolveByHost(host: string) {
    const hostname = normalizeHostname(host);

    const domain = await this.prisma.customDomain.findUnique({
      where: { hostname },
      include: { location: true, tenant: { select: { id: true, name: true } } },
    });

    if (!domain || domain.status !== DomainStatus.ACTIVE) {
      throw new NotFoundException('Site not found');
    }

    if (domain.location) {
      return {
        kind: 'location' as const,
        tenant: domain.tenant,
        location: {
          id: domain.location.id,
          slug: domain.location.slug,
          name: domain.location.name,
          displayName: domain.location.displayName,
          address: domain.location.address,
          timezone: domain.location.timezone,
        },
        branding: {
          logoUrl: domain.location.logoUrl,
          accentColor: domain.location.accentColor,
          heroImageUrl: domain.location.heroImageUrl,
        },
      };
    }

    return {
      kind: 'tenant' as const,
      tenant: domain.tenant,
      branding: {},
    };
  }
}
