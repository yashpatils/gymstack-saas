import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeHostname } from '../domains/domain.util';

const DEFAULT_BASE_DOMAIN = 'gymstack.club';
const RESERVED_HOSTS = new Set(['www', 'admin']);

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  private getBaseDomain(): string {
    return (process.env.BASE_DOMAIN ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? DEFAULT_BASE_DOMAIN).toLowerCase();
  }

  private extractSubdomain(hostname: string, baseDomain: string): string | null {
    if (!hostname.endsWith(`.${baseDomain}`)) {
      return null;
    }

    const slug = hostname.slice(0, -(baseDomain.length + 1));
    return slug || null;
  }

  private async resolveLocationByHost(host: string) {
    const hostname = normalizeHostname(host).split(':')[0] ?? '';
    const baseDomain = this.getBaseDomain();

    if (!hostname || hostname === baseDomain || RESERVED_HOSTS.has(hostname)) {
      return null;
    }

    const byCustomField = await this.prisma.gym.findFirst({
      where: { customDomain: hostname },
      select: { id: true, orgId: true },
    });

    if (byCustomField) {
      return byCustomField;
    }

    const customDomain = await this.prisma.customDomain.findFirst({
      where: { hostname, status: DomainStatus.ACTIVE, locationId: { not: null } },
      select: { locationId: true, tenantId: true },
    });

    if (customDomain?.locationId) {
      return { id: customDomain.locationId, orgId: customDomain.tenantId };
    }

    const slug = this.extractSubdomain(hostname, baseDomain);
    if (!slug || RESERVED_HOSTS.has(slug)) {
      return null;
    }

    return this.prisma.gym.findUnique({
      where: { slug },
      select: { id: true, orgId: true },
    });
  }

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
        primaryColor: true,
        accentGradient: true,
        heroTitle: true,
        heroSubtitle: true,
        customDomain: true,
        orgId: true,
      },
    });

    if (!location) throw new NotFoundException('Location not found');

    const tenant = await this.prisma.organization.findUnique({
      where: { id: location.orgId },
      select: { id: true, name: true, whiteLabelEnabled: true, whiteLabelBrandingEnabled: true },
    });

    return {
      tenantId: location.orgId,
      tenant: {
        id: tenant?.id ?? location.orgId,
        name: tenant?.name ?? '',
        whiteLabelEnabled: Boolean(tenant?.whiteLabelEnabled || tenant?.whiteLabelBrandingEnabled),
      },
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
        primaryColor: location.primaryColor,
        accentGradient: location.accentGradient,
        heroTitle: location.heroTitle,
        heroSubtitle: location.heroSubtitle,
        customDomain: location.customDomain,
      },
    };
  }

  async getLocationByHost(host: string) {
    const locationKey = await this.resolveLocationByHost(host);
    if (!locationKey) {
      throw new NotFoundException('Site not found');
    }

    const location = await this.prisma.gym.findUnique({
      where: { id: locationKey.id },
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentGradient: true,
        heroTitle: true,
        heroSubtitle: true,
      },
    });

    if (!location) {
      throw new NotFoundException('Site not found');
    }

    const tenant = await this.prisma.organization.findUnique({
      where: { id: locationKey.orgId },
      select: { id: true, name: true, whiteLabelEnabled: true, whiteLabelBrandingEnabled: true },
    });

    return {
      location,
      tenant: {
        id: tenant?.id ?? locationKey.orgId,
        name: tenant?.name ?? '',
        whiteLabelEnabled: Boolean(tenant?.whiteLabelEnabled || tenant?.whiteLabelBrandingEnabled),
      },
    };
  }

  async resolveByHost(host: string) {
    const locationResult = await this.getLocationByHost(host);

    return {
      kind: 'location' as const,
      tenant: { id: locationResult.tenant.id, name: locationResult.tenant.name },
      location: {
        id: locationResult.location.id,
        slug: locationResult.location.slug,
        name: locationResult.location.name,
        displayName: locationResult.location.displayName,
      },
      branding: {
        logoUrl: locationResult.location.logoUrl,
        primaryColor: locationResult.location.primaryColor,
        accentGradient: locationResult.location.accentGradient,
        heroTitle: locationResult.location.heroTitle,
        heroSubtitle: locationResult.location.heroSubtitle,
      },
      tenantFeature: locationResult.tenant,
    };
  }
}
