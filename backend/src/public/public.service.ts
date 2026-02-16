import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeHostname } from '../domains/domain.util';

const DEFAULT_BASE_DOMAIN = 'gymstack.club';
const RESERVED_SUBDOMAINS = new Set(['www', 'admin']);

type PublicLocation = {
  id: string;
  slug: string;
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentGradient: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
};

type PublicTenant = {
  id: string;
  whiteLabelEnabled: boolean;
};

type PublicLocationContext = {
  location: PublicLocation;
  tenant: PublicTenant;
};

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

  private isBaseAppHost(hostname: string, baseDomain: string): boolean {
    return new Set([baseDomain, `www.${baseDomain}`, `admin.${baseDomain}`]).has(hostname);
  }

  async resolveLocationFromHost(host: string): Promise<PublicLocationContext | null> {
    const hostname = normalizeHostname(host).split(':')[0] ?? '';
    const baseDomain = this.getBaseDomain();

    if (!hostname || this.isBaseAppHost(hostname, baseDomain)) {
      return null;
    }

    const byCustomDomain = await this.prisma.gym.findFirst({
      where: {
        customDomain: hostname,
        domainVerifiedAt: { not: null },
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentGradient: true,
        heroTitle: true,
        heroSubtitle: true,
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

    if (byCustomDomain) {
      return {
        location: {
          id: byCustomDomain.id,
          slug: byCustomDomain.slug,
          displayName: byCustomDomain.displayName,
          logoUrl: byCustomDomain.logoUrl,
          primaryColor: byCustomDomain.primaryColor,
          accentGradient: byCustomDomain.accentGradient,
          heroTitle: byCustomDomain.heroTitle,
          heroSubtitle: byCustomDomain.heroSubtitle,
        },
        tenant: {
          id: byCustomDomain.org.id,
          whiteLabelEnabled: Boolean(
            byCustomDomain.org.whiteLabelEnabled || byCustomDomain.org.whiteLabelBrandingEnabled,
          ),
        },
      };
    }

    const slug = this.extractSubdomain(hostname, baseDomain);
    if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
      return null;
    }

    const bySlug = await this.prisma.gym.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentGradient: true,
        heroTitle: true,
        heroSubtitle: true,
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

    if (!bySlug) {
      return null;
    }

    return {
      location: {
        id: bySlug.id,
        slug: bySlug.slug,
        displayName: bySlug.displayName,
        logoUrl: bySlug.logoUrl,
        primaryColor: bySlug.primaryColor,
        accentGradient: bySlug.accentGradient,
        heroTitle: bySlug.heroTitle,
        heroSubtitle: bySlug.heroSubtitle,
      },
      tenant: {
        id: bySlug.org.id,
        whiteLabelEnabled: Boolean(bySlug.org.whiteLabelEnabled || bySlug.org.whiteLabelBrandingEnabled),
      },
    };
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
      tenant: this.toTenantBranding(tenant, location.orgId),
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
    const resolved = await this.resolveLocationFromHost(host);

    if (!resolved) {
      return {
        location: null,
        tenant: null,
      };
    }

    return {
      location: resolved.location,
      tenant: resolved.tenant,
    };
  }

  async resolveByHost(host: string) {
    const locationResult = await this.getLocationByHost(host);
    if (!locationResult.location || !locationResult.tenant) {
      throw new NotFoundException('Site not found');
    }

    const [locationDetails, tenantDetails] = await Promise.all([
      this.prisma.gym.findUnique({
        where: { id: locationResult.location.id },
        select: { name: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: locationResult.tenant.id },
        select: { name: true },
      }),
    ]);

    return {
      kind: 'location' as const,
      tenant: { id: locationResult.tenant.id, name: tenantDetails?.name ?? '' },
      location: {
        id: locationResult.location.id,
        slug: locationResult.location.slug,
        name: locationDetails?.name ?? '',
        displayName: locationResult.location.displayName,
      },
      branding: {
        logoUrl: locationResult.location.logoUrl,
        primaryColor: locationResult.location.primaryColor,
        accentGradient: locationResult.location.accentGradient,
        heroTitle: locationResult.location.heroTitle,
        heroSubtitle: locationResult.location.heroSubtitle,
      },
      tenantFeature: {
        id: locationResult.tenant.id,
        name: tenantDetails?.name ?? '',
        whiteLabelEnabled: locationResult.tenant.whiteLabelEnabled,
      },
    };
  }
}
