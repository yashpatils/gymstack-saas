import { apiFetch } from './apiFetch';
import { toOptionalString } from './safe';

export type PublicLocation = {
  id: string;
  slug: string;
  name?: string | null;
  displayName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
};

export type TenantBranding = {
  id: string;
  whiteLabelEnabled: boolean;
};

type ResolvedSiteLocation = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
};

type ResolvedSiteBranding = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
};

export type ResolvedPublicSite = {
  kind: 'location' | 'tenant';
  tenant: { id: string; name: string };
  location?: ResolvedSiteLocation;
  branding: ResolvedSiteBranding;
  tenantFeature?: TenantBranding;
};

export type PublicLocationResponse = {
  location: PublicLocation | null;
  tenant: TenantBranding | null;
  tenantDisabled?: boolean;
};

type PublicLocationBySlugResponse = PublicLocationResponse & {
  tenantId: string;
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentGradient?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroImageUrl?: string | null;
    customDomain?: string | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePublicLocation(value: unknown): PublicLocation | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid public location payload');
  }

  const id = toOptionalString(value.id);
  const slug = toOptionalString(value.slug);

  if (!id || !slug) {
    throw new Error('Invalid public location payload');
  }

  const displayName = toOptionalString(value.displayName) ?? slug;

  return {
    id,
    slug,
    name: toOptionalString(value.name) ?? null,
    displayName,
    logoUrl: toOptionalString(value.logoUrl) ?? null,
    primaryColor: toOptionalString(value.primaryColor) ?? null,
    accentGradient: toOptionalString(value.accentGradient) ?? null,
    heroTitle: toOptionalString(value.heroTitle) ?? null,
    heroSubtitle: toOptionalString(value.heroSubtitle) ?? null,
  };
}

function parseTenantBranding(value: unknown): TenantBranding | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('Invalid tenant payload');
  }

  const id = toOptionalString(value.id);
  const whiteLabelEnabled = value.whiteLabelEnabled;

  if (!id || typeof whiteLabelEnabled !== 'boolean') {
    throw new Error('Invalid tenant payload');
  }

  return {
    id,
    whiteLabelEnabled,
  };
}

function parsePublicLocationResponse(value: unknown): PublicLocationResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid public location response');
  }

  return {
    location: parsePublicLocation(value.location),
    tenant: parseTenantBranding(value.tenant),
    tenantDisabled: typeof value.tenantDisabled === 'boolean' ? value.tenantDisabled : false,
  };
}

function isPublicLocationBySlugResponse(value: unknown): value is PublicLocationBySlugResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.tenantId !== 'string') {
    return false;
  }

  try {
    parsePublicLocationResponse(value);
    return true;
  } catch {
    return false;
  }
}

function isPublicLocationResponse(value: unknown): value is PublicLocationResponse {
  try {
    parsePublicLocationResponse(value);
    return true;
  } catch {
    return false;
  }
}

export async function getPublicLocationBySlug(slug: string): Promise<PublicLocationBySlugResponse> {
  return apiFetch<PublicLocationBySlugResponse>(
    `/api/public/location-by-slug/${encodeURIComponent(slug)}`,
    {},
    isPublicLocationBySlugResponse,
  );
}

export async function getPublicLocationByHost(host?: string): Promise<PublicLocationResponse> {
  const query = host ? `?host=${encodeURIComponent(host)}` : '';
  return apiFetch<PublicLocationResponse>(`/api/public/location-by-host${query}`, {}, isPublicLocationResponse);
}

export async function resolvePublicSite(host: string): Promise<ResolvedPublicSite> {
  return apiFetch<ResolvedPublicSite>(
    `/api/public/sites/resolve?host=${encodeURIComponent(host)}`,
    {},
    (value: unknown): value is ResolvedPublicSite => {
      if (!isRecord(value) || (value.kind !== 'location' && value.kind !== 'tenant')) {
        return false;
      }

      if (!isRecord(value.tenant) || typeof value.tenant.id !== 'string' || typeof value.tenant.name !== 'string') {
        return false;
      }

      if (!isRecord(value.branding)) {
        return false;
      }

      if (value.location !== undefined && value.location !== null) {
        if (!isRecord(value.location)) {
          return false;
        }

        if (
          typeof value.location.id !== 'string'
          || typeof value.location.slug !== 'string'
          || typeof value.location.name !== 'string'
          || typeof value.location.displayName !== 'string'
        ) {
          return false;
        }
      }

      return true;
    },
  );
}
